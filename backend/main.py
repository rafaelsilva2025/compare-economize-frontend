from pathlib import Path
from dotenv import load_dotenv
import os

# ✅ força pegar backend/.env (independente da pasta que você rodar)
# ✅ AJUSTE: no Railway pode não existir .env, então só carrega se o arquivo existir
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from routes.dev_seed import router as dev_seed_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ✅ NOVO: ajuda o FastAPI a respeitar X-Forwarded-Proto/Host (Railway/Proxy)
from starlette.middleware.base import BaseHTTPMiddleware

from routes.business import router as business_router
from routes.markets import router as markets_router
from routes.stats import router as stats_router
from routes.routes_billing import router as billing_router

from db import Base, engine
from routes.data import router as data_router
from routes.ai import router as ai_router
from routes.auth import router as auth_router
from routes.auth import me_alias_router


# ✅ NOVO: evita "Duplicate Operation ID" no Swagger/OpenAPI (Railway logs)
# Isso acontece quando existem funções com o mesmo nome em routers diferentes
# (ex.: update_market em business.py e markets.py).
def custom_generate_unique_id(route) -> str:
    try:
        methods = ",".join(sorted([m for m in (route.methods or []) if m]))
    except Exception:
        methods = ""

    try:
        tag = (route.tags[0] if getattr(route, "tags", None) else "default") or "default"
    except Exception:
        tag = "default"

    # route.name geralmente é o nome da função (ex.: update_market)
    name = getattr(route, "name", "route") or "route"
    path = getattr(route, "path", "") or ""

    # Garante ID único por tag + método + path + nome
    return f"{tag}-{methods}-{path}-{name}".replace(" ", "_")


app = FastAPI(
    title="Compare Economize API",
    version="1.0.0",
    generate_unique_id_function=custom_generate_unique_id,  # ✅ NOVO
)

# ✅ NOVO: middleware simples para aplicar headers de proxy no request.url (principalmente scheme)
class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        xf_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
        xf_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()

        # Reescreve scheme/host usados internamente pelo request.url
        if xf_proto:
            request.scope["scheme"] = xf_proto

        # ✅ Ajuste: server precisa ser (host, port). Se o host vier sem porta, usamos 443/80 conforme scheme.
        if xf_host:
            # xf_host pode vir "dominio.com" ou "dominio.com:1234"
            if ":" in xf_host:
                host, port = xf_host.rsplit(":", 1)
                try:
                    port = int(port)
                except Exception:
                    port = 443
                request.scope["server"] = (host, port)
            else:
                default_port = 443 if (request.scope.get("scheme") == "https") else 80
                request.scope["server"] = (xf_host, default_port)

        return await call_next(request)

app.add_middleware(ProxyHeadersMiddleware)

# ✅ CORS
# ✅ NOVO: permite configurar origens extras via .env (EXTRA_CORS_ORIGINS)
extra_origins_env = (os.getenv("EXTRA_CORS_ORIGINS") or "").strip()
extra_origins = [o.strip() for o in extra_origins_env.split(",") if o.strip()] if extra_origins_env else []

# ✅ opcional: se você definir FRONTEND_URL no .env/Railway, adiciona automaticamente
frontend_url_env = (os.getenv("FRONTEND_URL") or "").strip()
frontend_url_list = [frontend_url_env] if frontend_url_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # ✅ seu domínio (produção) — 3 "e"
        "https://compareeeconomize.com.br",
        "https://www.compareeeconomize.com.br",

        # ✅ se você usa o .com também (mesmo redirecionando)
        "https://compareeeconomize.com",
        "https://www.compareeeconomize.com",

        # ✅ Vercel (produção)
        "https://compare-economize-frontend.vercel.app",

        *frontend_url_list,  # ✅ pega FRONTEND_URL se você setar no env
        *extra_origins,      # ✅ extras via env
    ],
    # ✅ mantém ngrok liberado via regex
    allow_origin_regex=r"^https:\/\/.*\.ngrok\-free\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ AJUSTE: cria tabelas no startup (evita rodar em import/reload)
@app.on_event("startup")
def on_startup():
    # ✅ IMPORTANTE: garante que TODOS os models foram carregados
    # Sem isso, o SQLAlchemy não registra tabelas e create_all não cria nada no Postgres.
    try:
        import models  # noqa: F401
    except Exception as e:
        print("WARN: failed importing models:", repr(e))

    # ✅ DEBUG: mostra qual banco está sendo usado (Railway vs SQLite)
    try:
        print(
            "BOOT DATABASE_URL =",
            os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or os.getenv("DATABASE_PUBLIC_URL") or "sqlite (default?)"
        )
        print(
            "BOOT DB DIALECT HINT =",
            "postgres" if ("postgres" in (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "")) else "unknown/sqlite?"
        )
    except Exception:
        pass

    # ✅ Mantido: cria tabelas no startup.
    # ⚠️ Observação: em produção, o ideal é deixar o Alembic criar as tabelas,
    # mas manter isso aqui não quebra (desde que engine aponte pro Postgres certo).
    Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# ==========================
# ROTAS DA APLICAÇÃO
# ==========================
# 🔥 IMPORTANTE:
# - data_router provavelmente JÁ tem prefix="/api" lá dentro
# - então aqui NÃO colocamos prefix="/api", senão vira /api/api/...
app.include_router(data_router)

# IA: seu routes/ai.py tem prefix="/ai"
# aqui adicionamos /api na frente -> /api/ai/identify-products
app.include_router(ai_router, prefix="/api")

# Auth: seu routes/auth.py deve ter prefix="/auth"
# aqui adicionamos /api na frente -> /api/auth/google
app.include_router(auth_router, prefix="/api")

app.include_router(dev_seed_router, prefix="/api")

app.include_router(business_router, prefix="/api")
app.include_router(markets_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(me_alias_router, prefix="/api")

# ✅ Billing já tem prefix "/api/billing" dentro do router, então NÃO coloca prefix aqui
app.include_router(billing_router)
