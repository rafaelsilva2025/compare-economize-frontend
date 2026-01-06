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

app = FastAPI(title="Compare Economize API", version="1.0.0")

# ✅ NOVO: middleware simples para aplicar headers de proxy no request.url (principalmente scheme)
class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        xf_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
        xf_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()

        # Reescreve scheme/host usados internamente pelo request.url
        if xf_proto:
            request.scope["scheme"] = xf_proto

        if xf_host:
            request.scope["server"] = (xf_host, request.url.port or 443)

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
