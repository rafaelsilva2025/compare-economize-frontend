# db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

def _normalize_database_url(url: str) -> str:
    """
    Railway às vezes fornece postgres://
    SQLAlchemy prefere postgresql://
    """
    url = (url or "").strip()

    # ✅ Se for placeholder do Railway (não resolvido), ignora
    # Ex: "${{Postgres.DATABASE_URL}}"
    if url.startswith("${{") and url.endswith("}}"):
        return ""

    # ✅ Se vier com aspas (às vezes acontece em envs), remove
    if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
        url = url[1:-1].strip()

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    return url


def _redact_db_url(url: str) -> str:
    """
    Esconde senha no log (não vaza credencial).
    Ex: postgresql://user:PASS@host/db -> postgresql://user:***@host/db
    """
    try:
        if not url or "://" not in url:
            return url
        scheme, rest = url.split("://", 1)
        if "@" not in rest:
            return f"{scheme}://***"

        creds, tail = rest.split("@", 1)
        if ":" in creds:
            user = creds.split(":", 1)[0]
            return f"{scheme}://{user}:***@{tail}"
        return f"{scheme}://***@{tail}"
    except Exception:
        return "****"


def _get_database_url() -> str:
    # ✅ Prioridade total para Postgres no Railway
    # (Railway pode expor DATABASE_URL ou DATABASE_PUBLIC_URL dependendo do setup)
    candidates = [
        ("DATABASE_URL", os.getenv("DATABASE_URL") or ""),
        ("DATABASE_PUBLIC_URL", os.getenv("DATABASE_PUBLIC_URL") or ""),
        ("POSTGRES_URL", os.getenv("POSTGRES_URL") or ""),
        ("POSTGRESQL_URL", os.getenv("POSTGRESQL_URL") or ""),
    ]

    for key, raw in candidates:
        url = _normalize_database_url(raw)
        if url:
            # ✅ debug seguro (sem senha)
            try:
                print(f"DB: using {key} -> {_redact_db_url(url)}", flush=True)
            except Exception:
                pass
            return url

    # fallback local (dev)
    try:
        print("DB: no Postgres env found (or unresolved placeholder). Using sqlite:///./local.db", flush=True)
    except Exception:
        pass
    return "sqlite:///./local.db"


DATABASE_URL = _get_database_url()

# ✅ Engine correta dependendo do banco
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        # ✅ opcional: estabilidade melhor em conexões de cloud
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
