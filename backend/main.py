from pathlib import Path
from dotenv import load_dotenv
import os

# ✅ força pegar backend/.env (independente da pasta que você rodar)
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

from routes.dev_seed import router as dev_seed_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# ✅ CORS (inclui 5173 e 5174)
# ✅ NOVO: permite também domínios ngrok (ex: https://xxxx.ngrok-free.dev)
# ✅ NOVO: permite configurar origens extras via .env (EXTRA_CORS_ORIGINS)
extra_origins_env = (os.getenv("EXTRA_CORS_ORIGINS") or "").strip()
extra_origins = [o.strip() for o in extra_origins_env.split(",") if o.strip()] if extra_origins_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://compareeconomize.com.br",
        "https://www.compareeconomize.com.br",
        *extra_origins,  # ✅ NOVO
    ],
    # ✅ NOVO: libera qualquer subdomínio do ngrok (útil em testes)
    # Obs: regex só funciona se o Origin bater (normalmente só em chamadas do browser)
    allow_origin_regex=r"^https:\/\/.*\.ngrok\-free\.dev$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ cria as tabelas no SQLite (compareeconomize.db)
Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# ==========================
# ROTAS DA APLICAÇÃO
# ==========================
# 🔥 IMPORTANTE:
# - data_router provavelmente JÁ tem prefix="/api" lá dentro (por isso antes você via /api/products etc).
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
