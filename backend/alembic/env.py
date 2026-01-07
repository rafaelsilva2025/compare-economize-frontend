from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import create_engine  # ✅ NOVO

from alembic import context

import os  # ✅ NOVO

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

# ✅ NOVO: pega URL do banco por ENV (Railway) com fallback para alembic.ini
def _get_database_url() -> str:
    # Railway normalmente define DATABASE_URL (se você criar a variável no service)
    url = (os.getenv("DATABASE_URL") or "").strip()

    # fallback (caso você use outra variável por algum motivo)
    if not url:
        url = (os.getenv("POSTGRES_URL") or "").strip()

    # fallback final: alembic.ini
    # ⚠️ Evite usar %(DATABASE_URL)s no Windows (InterpolationMissingOptionError)
    if not url:
        url = (config.get_main_option("sqlalchemy.url") or "").strip()

    if not url:
        raise RuntimeError(
            "DATABASE_URL não encontrado. Defina DATABASE_URL no ambiente (Railway) "
            "ou configure sqlalchemy.url no alembic.ini."
        )

    # ✅ segurança: se alguém deixou DATABASE_URL vazio/placeholder
    if url.lower().startswith("sqlite") and (os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID")):
        # Se você está rodando via Railway, SQLite quase sempre é erro de configuração
        print("⚠️ AVISO: Você está em ambiente Railway e DATABASE_URL parece SQLite. Verifique as Variáveis no Railway.")

    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # ✅ ATUALIZADO: usa DATABASE_URL (ENV) primeiro
    url = _get_database_url()

    # ✅ NOVO: injeta no config também (compatibilidade / logs)
    # (não quebra nada e evita confusão)
    try:
        config.set_main_option("sqlalchemy.url", url)
    except Exception:
        pass

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,              # ✅ NOVO: detecta mudança de tipo
        compare_server_default=True,    # ✅ NOVO: detecta default server-side
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # ✅ ATUALIZADO: usa DATABASE_URL do ENV (Railway) para criar engine
    db_url = _get_database_url()

    # ✅ NOVO: injeta no config também (compatibilidade / logs)
    try:
        config.set_main_option("sqlalchemy.url", db_url)
    except Exception:
        pass

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
            compare_type=True,            # ✅ NOVO
            compare_server_default=True,  # ✅ NOVO
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
