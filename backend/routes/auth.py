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

# ✅ NOVO: envio de e-mail (código de verificação) sem libs externas
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta


router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL_DEFAULT = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ✅ NOVO: força base pública do backend (RECOMENDADO em produção)
# Ex: https://api.compareeeconomize.com.br
PUBLIC_BACKEND_URL = (os.getenv("PUBLIC_BACKEND_URL") or "").strip().rstrip("/")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# ✅ NOVO: exigir email verificado no login (opcional)
REQUIRE_EMAIL_VERIFIED = (os.getenv("REQUIRE_EMAIL_VERIFIED") or "").strip() == "1"

# ✅ NOVO: bootstrap admin (produção) com token único
ADMIN_BOOTSTRAP_TOKEN = (os.getenv("ADMIN_BOOTSTRAP_TOKEN") or "").strip()
ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD") or "").strip()

# ✅ NOVO: SMTP para envio de código (opcional)
SMTP_HOST = (os.getenv("SMTP_HOST") or "").strip()
SMTP_PORT = int((os.getenv("SMTP_PORT") or "587").strip() or "587")
SMTP_USER = (os.getenv("SMTP_USER") or "").strip()
SMTP_PASS = (os.getenv("SMTP_PASS") or "").strip()
SMTP_FROM = (os.getenv("SMTP_FROM") or SMTP_USER or "no-reply@compareeconomize.com").strip()
SMTP_TLS = (os.getenv("SMTP_TLS") or "1").strip() != "0"


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
# ✅ Email verify helpers
# ---------------------------
def _now_utc():
    return datetime.utcnow()


def _generate_6digit_code() -> str:
    return str(secrets.randbelow(1_000_000)).zfill(6)


def _send_email_code(to_email: str, code: str) -> bool:
    """
    Envia email via SMTP se configurado.
    Se SMTP não estiver configurado, apenas loga (não quebra cadastro).
    """
    to_email = (to_email or "").strip().lower()
    if not to_email:
        return False

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print(f"⚠️ SMTP não configurado. Código para {to_email}: {code}")
        return True

    try:
        msg = EmailMessage()
        msg["Subject"] = "Seu código de verificação - Compare Economize"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg.set_content(
            f"Seu código de verificação é: {code}\n\n"
            f"Se você não solicitou isso, ignore este email."
        )

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            if SMTP_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)

        return True
    except Exception as e:
        print("EMAIL_SEND_ERROR:", repr(e))
        return False


def _set_user_email_verified(u, value: bool):
    if hasattr(u, "emailVerified"):
        u.emailVerified = bool(value)
        return
    setattr(u, "emailVerified", bool(value))


def _set_user_verify_code(u, code: str | None, expires_at):
    if hasattr(u, "emailVerifyCode"):
        u.emailVerifyCode = code
    else:
        setattr(u, "emailVerifyCode", code)

    if hasattr(u, "emailVerifyExpiresAt"):
        u.emailVerifyExpiresAt = expires_at
    else:
        setattr(u, "emailVerifyExpiresAt", expires_at)


def _get_user_email_verified(u) -> bool:
    if hasattr(u, "emailVerified"):
        return bool(getattr(u, "emailVerified", False))
    return False


def _get_user_verify_code(u):
    if hasattr(u, "emailVerifyCode"):
        return getattr(u, "emailVerifyCode", None)
    return None


def _get_user_verify_expires(u):
    if hasattr(u, "emailVerifyExpiresAt"):
        return getattr(u, "emailVerifyExpiresAt", None)
    return None


def _set_user_admin(u, is_admin: bool):
    # mantém compatibilidade: role + isAdmin
    if hasattr(u, "isAdmin"):
        u.isAdmin = bool(is_admin)
    else:
        setattr(u, "isAdmin", bool(is_admin))

    if hasattr(u, "role"):
        u.role = "admin" if is_admin else "user"
    else:
        setattr(u, "role", "admin" if is_admin else "user")

    # admin deve ter acesso a tudo sem pagar
    if hasattr(u, "plan"):
        if bool(is_admin):
            u.plan = "premium"


def _get_user_is_admin(u) -> bool:
    if hasattr(u, "isAdmin") and getattr(u, "isAdmin", False):
        return True
    if hasattr(u, "role") and str(getattr(u, "role", "")).lower() == "admin":
        return True
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


class RequestEmailCodeIn(BaseModel):
    email: EmailStr


class VerifyEmailCodeIn(BaseModel):
    email: EmailStr
    code: str


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


def _issue_token_for_user(u: User, account_type: str):
    fake_token = secrets.token_urlsafe(32)

    # mantém sessão fake (como você já fazia)
    try:
        sess = AuthSession(token=fake_token, userId=u.id)
        return fake_token, sess
    except Exception:
        return fake_token, None


def _jwt_for_user(u: User, account_type: str):
    token_to_send = secrets.token_urlsafe(32)
    if create_jwt:
        token_to_send = create_jwt(
            user_id=u.id,
            email=u.email,
            account_type=_get_user_account_type(u, account_type),
        )
    return token_to_send


def _public_user_payload(db: Session, user_dep_value):
    """
    Compat: seu get_current_user pode devolver dict ou algo.
    Aqui garantimos que /me devolve os campos do User do banco,
    incluindo isAdmin/role/emailVerified/plan.
    """
    try:
        uid = None
        if isinstance(user_dep_value, dict):
            uid = user_dep_value.get("id") or user_dep_value.get("sub")
        else:
            uid = getattr(user_dep_value, "id", None)

        if not uid:
            return user_dep_value

        u = db.query(User).filter(User.id == str(uid)).first()
        if not u:
            return user_dep_value

        return {
            "id": u.id,
            "email": u.email,
            "name": getattr(u, "name", None) or getattr(u, "full_name", None),
            "accountType": _get_user_account_type(u, "user"),
            "plan": getattr(u, "plan", "free"),
            "isAdmin": _get_user_is_admin(u),
            "role": getattr(u, "role", "user"),
            "emailVerified": _get_user_email_verified(u),
        }
    except Exception:
        return user_dep_value


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

                # ✅ NOVO: Google = e-mail verificado
                _set_user_email_verified(u, True)
                _set_user_verify_code(u, None, None)

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

                # ✅ NOVO: garante verificação pelo Google
                if not _get_user_email_verified(u):
                    _set_user_email_verified(u, True)
                    _set_user_verify_code(u, None, None)
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

    # ✅ NOVO: cria código de verificação
    code = _generate_6digit_code()
    exp = _now_utc() + timedelta(minutes=15)
    _set_user_email_verified(u, False)
    _set_user_verify_code(u, code, exp)

    db.add(u)
    db.commit()
    db.refresh(u)

    # ✅ tenta enviar email (se não tiver SMTP, loga no console)
    _send_email_code(email, code)

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

    return {
        "token": token_to_send,
        "user_id": u.id,
        "email": u.email,
        "account_type": _get_user_account_type(u, account_type),
        "email_verified": _get_user_email_verified(u),
        "verification_sent": True,
    }


# ✅ NOVO: reenviar/gerar código de verificação
@router.post("/request-email-code")
def request_email_code(payload: RequestEmailCodeIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    u = db.query(User).filter(User.email == email).first()
    if not u:
        # não vaza se email existe ou não
        return {"ok": True, "sent": True}

    if _get_user_email_verified(u):
        return {"ok": True, "sent": False, "already_verified": True}

    code = _generate_6digit_code()
    exp = _now_utc() + timedelta(minutes=15)
    _set_user_verify_code(u, code, exp)

    db.commit()

    _send_email_code(email, code)
    return {"ok": True, "sent": True}


# ✅ NOVO: validar código e marcar emailVerified
@router.post("/verify-email-code")
def verify_email_code(payload: VerifyEmailCodeIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    code = str(payload.code or "").strip()

    u = db.query(User).filter(User.email == email).first()
    if not u:
        return JSONResponse({"error": "invalid_code"}, status_code=400)

    if _get_user_email_verified(u):
        return {"ok": True, "email_verified": True}

    saved_code = _get_user_verify_code(u)
    exp = _get_user_verify_expires(u)

    if not saved_code or saved_code != code:
        return JSONResponse({"error": "invalid_code"}, status_code=400)

    if exp and isinstance(exp, datetime):
        if _now_utc() > exp:
            return JSONResponse({"error": "code_expired"}, status_code=400)

    _set_user_email_verified(u, True)
    _set_user_verify_code(u, None, None)
    db.commit()

    return {"ok": True, "email_verified": True}


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

    # ✅ NOVO: se exigir email verificado, bloqueia
    if REQUIRE_EMAIL_VERIFIED and not _get_user_email_verified(u):
        return JSONResponse({"error": "email_not_verified"}, status_code=403)

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

    return {
        "token": token_to_send,
        "user_id": u.id,
        "email": u.email,
        "account_type": acct,
        "email_verified": _get_user_email_verified(u),
        "isAdmin": _get_user_is_admin(u),
    }


# ✅ ORIGINAL (mantido)
@router.get("/me")
def me(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # ✅ ATUALIZADO: devolve payload enriquecido com isAdmin/role/emailVerified
    return _public_user_payload(db, user)


# ✅ NOVO: bootstrap admin com segurança (produção)
# Configure no Railway:
# ADMIN_BOOTSTRAP_TOKEN=umtokenforte
# ADMIN_EMAIL=empresaslim@gmail.com
# ADMIN_PASSWORD=92123522
@router.post("/bootstrap-admin")
def bootstrap_admin(request: Request, db: Session = Depends(get_db)):
    """
    Cria (ou promove) o ADMIN usando ENV + token.
    - Use UMA vez, depois pode remover ADMIN_BOOTSTRAP_TOKEN do Railway.
    """
    body = {}
    try:
        body = request._json if hasattr(request, "_json") else {}
    except Exception:
        body = {}

    # ✅ também aceita via header
    token = (request.headers.get("x-admin-bootstrap-token") or "").strip()

    # ✅ e aceita no query param (fallback)
    if not token:
        try:
            token = (request.query_params.get("token") or "").strip()
        except Exception:
            token = ""

    if not ADMIN_BOOTSTRAP_TOKEN or token != ADMIN_BOOTSTRAP_TOKEN:
        return JSONResponse({"error": "forbidden"}, status_code=403)

    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        return JSONResponse({"error": "missing_admin_envs"}, status_code=500)

    u = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    created = False

    if not u:
        u = User(id=str(uuid.uuid4()), email=ADMIN_EMAIL)
        _set_user_full_name(u, "Admin")
        _set_user_account_type(u, "business")  # admin pode ver empresa + usuário
        _set_user_password_hash(u, _hash_password(ADMIN_PASSWORD))
        _set_user_email_verified(u, True)
        _set_user_verify_code(u, None, None)
        _set_user_admin(u, True)
        db.add(u)
        db.commit()
        db.refresh(u)
        created = True
    else:
        # promove e garante senha e verificação
        _set_user_admin(u, True)
        if not _get_user_password_hash(u):
            _set_user_password_hash(u, _hash_password(ADMIN_PASSWORD))
        _set_user_email_verified(u, True)
        _set_user_verify_code(u, None, None)
        db.commit()
        db.refresh(u)

    return {
        "ok": True,
        "created": created,
        "email": u.email,
        "user_id": u.id,
        "isAdmin": True,
        "plan": getattr(u, "plan", "premium"),
    }


# ✅ NOVO: endpoint para checar admin (útil pro front)
@router.get("/is-admin")
def is_admin(db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = _public_user_payload(db, user)
    try:
        return {"isAdmin": bool(data.get("isAdmin"))}
    except Exception:
        return {"isAdmin": False}


# ✅ NOVO: ALIAS real para compatibilidade com o FRONT (mantido)
me_alias_router = APIRouter(tags=["auth-compat"])


@me_alias_router.get("/me", include_in_schema=False)
def me_alias(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return _public_user_payload(db, user)
