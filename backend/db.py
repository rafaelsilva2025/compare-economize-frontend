import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ✅ ATUALIZADO (sem apagar nada): usa DATABASE_URL do Railway (Postgres)
# e mantém fallback para SQLite local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./compareeconomize.db")

# ✅ Detecta se é SQLite para aplicar connect_args correto
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine_kwargs = {}

# ✅ necessário no SQLite (mantido), não usar no Postgres
if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

# ✅ cria engine com o banco correto
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # ✅ ajuda em conexões de produção (Postgres)
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
