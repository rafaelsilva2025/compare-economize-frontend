import os
import time
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ✅ ADICIONADO (fallback por sessão/token salvo no SQLite)
from sqlalchemy.orm import Session
from db import get_db
from models import AuthSession, User

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRES_SEC = 60 * 60 * 24 * 7  # 7 dias

security = HTTPBearer(auto_error=False)


def create_jwt(user_id: str, email: str, account_type: str = "user"):
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "type": account_type,
        "iat": now,
        "exp": now + JWT_EXPIRES_SEC,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),  # ✅ ADICIONADO
):
    token = None

    # Bearer token
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials

    # fallback (se algum dia usar cookie)
    if not token:
        token = request.cookies.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="missing token")

    # ==========================
    # 1) TENTA JWT PRIMEIRO
    # ==========================
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

        user_id = data.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="invalid token")

        # ✅ preferimos retornar o User real do banco (mais compatível com rotas)
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            # ✅ mantém compatibilidade: algumas partes do front/fluxo usam "type"
            try:
                setattr(u, "type", getattr(u, "accountType", data.get("type", "user")))
            except Exception:
                pass
            return u

        # fallback se por algum motivo usuário não existir no banco
        return {
            "id": user_id,
            "email": data.get("email"),
            "type": data.get("type", "user"),
        }

    except HTTPException:
        raise
    except Exception:
        # não retorna erro ainda: tenta fallback de sessão no banco
        pass

    # ==========================
    # 2) FALLBACK: TOKEN SALVO NO SQLITE (AuthSession)
    # ==========================
    try:
        sess = db.query(AuthSession).filter(AuthSession.token == token).first()
        if not sess:
            raise HTTPException(status_code=401, detail="invalid token")

        u = db.query(User).filter(User.id == sess.userId).first()
        if not u:
            raise HTTPException(status_code=401, detail="invalid token")

        # ✅ compatibilidade: "type" baseado no seu models.py (accountType)
        try:
            setattr(u, "type", getattr(u, "accountType", "user"))
        except Exception:
            pass

        # ✅ retorna o User real (melhor para rotas como billing, me, etc.)
        return u

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="invalid token")
