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
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def _get_database_url() -> str:
    # ✅ Prioridade total para Postgres no Railway
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or os.getenv("POSTGRESQL_URL") or ""
    url = _normalize_database_url(url)

    if url:
        return url

    # fallback local (dev)
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
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
