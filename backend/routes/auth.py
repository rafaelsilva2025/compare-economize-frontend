import os
import secrets
from urllib.parse import urlencode
import uuid

import httpx
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from db import get_db
from models import User, AuthSession
from auth_jwt import get_current_user

# ✅ NOVO: gera JWT real (sem remover nada do que você já tem)
try:
    from auth_jwt import create_jwt
except Exception:
    create_jwt = None  # fallback seguro

# ✅ NOVO: schemas e helpers para login/cadastro por email/senha
from pydantic import BaseModel, EmailStr
import hashlib
import base64
import hmac


router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL_DEFAULT = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ✅ NOVO: força base pública do backend (RECOMENDADO em produção)
# Ex: https://api.compareeeeconomize.com.br
PUBLIC_BACKEND_URL = (os.getenv("PUBLIC_BACKEND_URL") or "").strip().rstrip("/")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


# ✅ NOVO: detecta base externa correta atrás de proxy (Railway/Cloudflare/etc.)
def _external_base_url(request: Request) -> str:
    # 1) Se você definiu PUBLIC_BACKEND_URL, usa ela sempre (mais confiável)
    if PUBLIC_BACKEND_URL:
        return PUBLIC_BACKEND_URL

    # 2) Caso contrário, tenta ler headers de proxy
    xf_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
    xf_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
    xf_port = (request.headers.get("x-forwarded-port") or "").split(",")[0].strip()

    # fallback
    scheme = xf_proto or request.url.scheme or "http"
    host = xf_host or request.url.hostname or request.headers.get("host") or "localhost"

    # evita duplicar porta se o host já vier com :porta
    if ":" in host:
        base = f"{scheme}://{host}"
        return base.rstrip("/")

    # adiciona porta só se fizer sentido
    if xf_port and xf_port not in ("80", "443"):
        base = f"{scheme}://{host}:{xf_port}"
    else:
        base = f"{scheme}://{host}"

    return base.rstrip("/")


def _build_callback_url(request: Request) -> str:
    base = _external_base_url(request).rstrip("/")
    return f"{base}/api/auth/google/callback"


# ✅ NOVO: cookies seguros para armazenar URL/valores complexos (sem quebrar resposta)
def _cookie_encode(value: str) -> str:
    if value is None:
        return ""
    raw = value.encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def _cookie_decode(value: str) -> str:
    if not value:
        return ""
    try:
        raw = base64.urlsafe_b64decode(value.encode("utf-8"))
        return raw.decode("utf-8")
    except Exception:
        # fallback: se veio "cru" por algum motivo, devolve como está
        return value


# ---------------------------
# ✅ Password helpers (sem libs externas)
# ---------------------------
def _hash_password(password: str) -> str:
    iters = 120_000
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iters, dklen=32)
    return "pbkdf2$%d$%s$%s" % (
        iters,
        base64.urlsafe_b64encode(salt).decode("utf-8"),
        base64.urlsafe_b64encode(dk).decode("utf-8"),
    )


def _verify_password(password: str, stored: str) -> bool:
    try:
        parts = stored.split("$")
        if len(parts) != 4:
            return False
        _, iters_s, salt_b64, dk_b64 = parts
        iters = int(iters_s)
        salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
        dk = base64.urlsafe_b64decode(dk_b64.encode("utf-8"))
        test = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iters, dklen=len(dk))
        return hmac.compare_digest(test, dk)
    except Exception:
        return False


# ---------------------------
# ✅ Schemas (email/senha)
# ---------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    account_type: str = "user"  # user | business


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _get_user_password_hash(u):
    for attr in ["password_hash", "hashed_password", "passwordHash"]:
        if hasattr(u, attr):
            return getattr(u, attr)
    return None


def _set_user_password_hash(u, value: str):
    if hasattr(u, "password_hash"):
        u.password_hash = value
        return
    if hasattr(u, "hashed_password"):
        u.hashed_password = value
        return
    if hasattr(u, "passwordHash"):
        u.passwordHash = value
        return
    setattr(u, "password_hash", value)


def _set_user_account_type(u, value: str):
    if hasattr(u, "account_type"):
        u.account_type = value
        return
    if hasattr(u, "accountType"):
        u.accountType = value
        return
    setattr(u, "account_type", value)


def _set_user_full_name(u, value: str | None):
    if not value:
        return
    if hasattr(u, "full_name"):
        u.full_name = value
        return
    if hasattr(u, "name"):
        u.name = value
        return
    setattr(u, "full_name", value)


def _get_user_account_type(u, fallback: str = "user") -> str:
    acct = None
    if hasattr(u, "account_type"):
        acct = getattr(u, "account_type", None)
    if acct is None and hasattr(u, "accountType"):
        acct = getattr(u, "accountType", None)
    return (acct or fallback or "user").lower()


@router.get("/google")
async def google_login(request: Request, type: str = "user", redirectTo: str | None = None):
    if not GOOGLE_CLIENT_ID:
        return JSONResponse(
            {"error": "GOOGLE_CLIENT_ID não configurado no .env do backend"},
            status_code=500,
        )

    callback_url = _build_callback_url(request)
    state = secrets.token_urlsafe(24)

    frontend_redirect = redirectTo or f"{FRONTEND_URL_DEFAULT}/login?google=1&type={type}"

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    # ✅ mantém RedirectResponse
    resp = RedirectResponse(url=url, status_code=302)

    # ✅ NOVO: secure cookie quando estiver em https (produção)
    base = _external_base_url(request)
    is_https = base.lower().startswith("https://")

    # ✅ FIX: cookies com valores codificados + path="/" (evita erro e perda de cookie)
    # Se esses cookies quebrarem, o navegador pode mostrar 0 B / request failed
    try:
        resp.set_cookie("oauth_state", state, httponly=True, samesite="lax", path="/", secure=is_https)
        resp.set_cookie("oauth_type", (type or "user"), httponly=True, samesite="lax", path="/", secure=is_https)
        resp.set_cookie("oauth_redirect", _cookie_encode(frontend_redirect), httponly=True, samesite="lax", path="/", secure=is_https)
    except Exception as e:
        print("AUTH_GOOGLE_SET_COOKIE_ERROR:", repr(e))
        return JSONResponse({"error": "set_cookie_failed", "detail": repr(e)}, status_code=500)

    return resp


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    if not code:
        return JSONResponse({"error": "missing code"}, status_code=400)

    saved_state = request.cookies.get("oauth_state")
    account_type = request.cookies.get("oauth_type", "user")

    # ✅ FIX: decodifica o redirect salvo em cookie
    saved_redirect_raw = request.cookies.get("oauth_redirect") or ""
    saved_redirect = _cookie_decode(saved_redirect_raw)

    frontend_redirect = (
        saved_redirect
        or f"{FRONTEND_URL_DEFAULT}/login?google=1&type={account_type}"
    )

    if not state or not saved_state or state != saved_state:
        return JSONResponse({"error": "invalid state"}, status_code=400)

    if not GOOGLE_CLIENT_SECRET:
        return JSONResponse(
            {"error": "GOOGLE_CLIENT_SECRET não configurado no .env do backend"},
            status_code=500,
        )

    callback_url = _build_callback_url(request)

    async with httpx.AsyncClient(timeout=20) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        return JSONResponse(
            {"error": "token_exchange_failed", "detail": token_resp.text},
            status_code=500,
        )

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return JSONResponse({"error": "missing access_token"}, status_code=500)

    async with httpx.AsyncClient(timeout=20) as client:
        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if user_resp.status_code != 200:
        return JSONResponse(
            {"error": "userinfo_failed", "detail": user_resp.text},
            status_code=500,
        )

    userinfo = user_resp.json()
    email = userinfo.get("email")
    name = userinfo.get("name")

    fake_token = secrets.token_urlsafe(32)
    token_to_send = fake_token
    user_id = ""

    try:
        if email:
            email = str(email).lower().strip()

            u = db.query(User).filter(User.email == email).first()

            if not u:
                u = User(
                    id=str(uuid.uuid4()),
                    email=email,
                )
                if hasattr(u, "full_name"):
                    u.full_name = name
                elif hasattr(u, "name"):
                    u.name = name

                _set_user_account_type(u, (account_type or "user").lower())

                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                changed = False
                if name:
                    if hasattr(u, "full_name") and getattr(u, "full_name", None) != name:
                        u.full_name = name
                        changed = True
                    if hasattr(u, "name") and getattr(u, "name", None) != name:
                        u.name = name
                        changed = True

                acct_now = _get_user_account_type(u, account_type or "user")
                if acct_now != (account_type or "user").lower():
                    _set_user_account_type(u, (account_type or "user").lower())
                    changed = True

                if changed:
                    db.commit()
                    db.refresh(u)

            user_id = u.id

            sess = AuthSession(token=fake_token, userId=u.id)
            db.add(sess)
            db.commit()

            if create_jwt:
                token_to_send = create_jwt(
                    user_id=u.id,
                    email=u.email,
                    account_type=_get_user_account_type(u, account_type),
                )

    except Exception as e:
        print("AUTH_CALLBACK_ERROR:", repr(e))

    join = "&" if "?" in frontend_redirect else "?"
    final_url = (
        f"{frontend_redirect}{join}"
        f"token={token_to_send}"
        f"&type={account_type}"
        f"&user_id={user_id}"
    )

    resp = RedirectResponse(url=final_url, status_code=302)
    resp.delete_cookie("oauth_state", path="/")
    resp.delete_cookie("oauth_type", path="/")
    resp.delete_cookie("oauth_redirect", path="/")
    return resp


# ✅ NOVO: Cadastro por email/senha (sem remover nada)
@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    account_type = (payload.account_type or "user").lower().strip()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return JSONResponse({"error": "email_already_exists"}, status_code=409)

    u = User(id=str(uuid.uuid4()), email=email)
    _set_user_full_name(u, payload.full_name)
    _set_user_account_type(u, account_type)
    _set_user_password_hash(u, _hash_password(payload.password))

    db.add(u)
    db.commit()
    db.refresh(u)

    fake_token = secrets.token_urlsafe(32)
    try:
        sess = AuthSession(token=fake_token, userId=u.id)
        db.add(sess)
        db.commit()
    except Exception as e:
        print("AUTH_REGISTER_SESSION_WARN:", repr(e))

    token_to_send = fake_token
    if create_jwt:
        token_to_send = create_jwt(user_id=u.id, email=u.email, account_type=_get_user_account_type(u, account_type))

    return {"token": token_to_send, "user_id": u.id, "email": u.email, "account_type": _get_user_account_type(u, account_type)}


# ✅ NOVO: Login por email/senha (sem remover nada)
@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()

    u = db.query(User).filter(User.email == email).first()
    if not u:
        return JSONResponse({"error": "invalid_credentials"}, status_code=401)

    stored = _get_user_password_hash(u)
    if not stored or not _verify_password(payload.password, stored):
        return JSONResponse({"error": "invalid_credentials"}, status_code=401)

    acct = _get_user_account_type(u, "user")

    fake_token = secrets.token_urlsafe(32)
    try:
        sess = AuthSession(token=fake_token, userId=u.id)
        db.add(sess)
        db.commit()
    except Exception as e:
        print("AUTH_LOGIN_SESSION_WARN:", repr(e))

    token_to_send = fake_token
    if create_jwt:
        token_to_send = create_jwt(user_id=u.id, email=u.email, account_type=acct)

    return {"token": token_to_send, "user_id": u.id, "email": u.email, "account_type": acct}


# ✅ ORIGINAL (mantido)
@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


# ✅ NOVO: ALIAS real para compatibilidade com o FRONT
# Front chama /api/me → cai aqui → usa o mesmo JWT
# (não usa "/../me" porque isso NÃO cria um path válido)
me_alias_router = APIRouter(tags=["auth-compat"])


@me_alias_router.get("/me", include_in_schema=False)
def me_alias(user=Depends(get_current_user)):
    return user
