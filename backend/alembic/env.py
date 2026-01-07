from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import create_engine  # ✅ NOVO (mantém)
from alembic import context

import os  # ✅ NOVO (mantém)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from db import Base
import models  # garante que os models carreguem
target_metadata = Base.metadata


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

# ✅ NOVO: normaliza postgres:// -> postgresql:// (Railway às vezes usa postgres://)
def _normalize_database_url(url: str) -> str:
    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

# ✅ NOVO: pega URL do banco por ENV (Railway) com fallback para alembic.ini
def _get_database_url() -> str:
    # Railway normalmente define DATABASE_URL
    url = (os.getenv("DATABASE_URL") or "").strip()

    # fallback (caso você use outra variável por algum motivo)
    if not url:
        url = (os.getenv("POSTGRES_URL") or "").strip()

    # fallback final: alembic.ini (mas evite %(DATABASE_URL)s no Windows)
    if not url:
        url = (config.get_main_option("sqlalchemy.url") or "").strip()

    url = _normalize_database_url(url)

    if not url:
        raise RuntimeError(
            "DATABASE_URL não encontrado. Defina DATABASE_URL no ambiente (Railway) "
            "ou configure sqlalchemy.url no alembic.ini."
        )

    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    # ✅ ATUALIZADO: usa DATABASE_URL (ENV) primeiro
    url = _get_database_url()

    # ✅ NOVO: força o alembic a usar essa URL (evita ini antigo)
    config.set_main_option("sqlalchemy.url", url)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,              # ✅ detecta mudança de tipo
        compare_server_default=True,    # ✅ detecta default server-side
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # ✅ ATUALIZADO: usa DATABASE_URL do ENV (Railway) para criar engine
    db_url = _get_database_url()

    # ✅ NOVO: força o alembic a usar essa URL (evita pegar ini antigo)
    config.set_main_option("sqlalchemy.url", db_url)

    # ✅ NOVO: engine direto (melhor para Railway/Windows)
    connectable = create_engine(
        db_url,
        pool_pre_ping=True,
        poolclass=pool.NullPool,
    )

    # ✅ MANTIDO (sem excluir nada): fallback antigo via alembic.ini
    # Se por algum motivo você quiser voltar a usar o alembic.ini,
    # basta comentar o create_engine acima e descomentar o bloco abaixo.
    # connectable = engine_from_config(
    #     config.get_section(config.config_ini_section, {}),
    #     prefix="sqlalchemy.",
    #     poolclass=pool.NullPool,
    # )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
