from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from datetime import datetime, timedelta
import os


from db import get_db
from models import Business
from auth_jwt import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


# ✅ NOVO (sem apagar nada): helpers para suportar user como dict OU como model
def _get_user_field(user, key: str, default=None):
    try:
        if isinstance(user, dict):
            return user.get(key, default)
        return getattr(user, key, default)
    except Exception:
        return default


def _get_user_id(user) -> str | None:
    # tenta padrões comuns: id / user_id / sub
    uid = _get_user_field(user, "id")
    if uid:
        return str(uid)

    uid = _get_user_field(user, "user_id")
    if uid:
        return str(uid)

    uid = _get_user_field(user, "sub")
    if uid:
        return str(uid)

    return None


# ✅ NOVO: admin allowlist por ENV (produção)
# você pode setar no Railway:
# ADMIN_EMAILS=empresaslim@gmail.com,outra@admin.com
_ADMIN_EMAILS_RAW = (os.getenv("ADMIN_EMAILS") or "").strip()
_ADMIN_EMAILS = {
    e.strip().lower()
    for e in _ADMIN_EMAILS_RAW.split(",")
    if e.strip()
}

# ✅ fallback (se você não setar ENV ainda)
# (pode remover depois se quiser, mas não é obrigatório)
_DEFAULT_ADMIN_EMAIL = "empresaslim@gmail.com"


def _is_admin(user) -> bool:
    # aceita vários formatos do seu sistema sem depender do model exato

    # ✅ 1) flag direto no usuário (recomendado)
    is_admin_flag = _get_user_field(user, "isAdmin", None)
    if is_admin_flag is True:
        return True

    # ✅ 2) role
    role = str(_get_user_field(user, "role", "") or "").lower().strip()
    if role == "admin":
        return True

    # ✅ 3) allowlist por email (recomendado p/ produção)
    email = str(_get_user_field(user, "email", "") or "").lower().strip()
    if email and email in _ADMIN_EMAILS:
        return True

    # ✅ 4) fallback hardcoded (pra você testar já)
    if email and email == _DEFAULT_ADMIN_EMAIL:
        return True

    # ✅ 5) compat antiga (não depende disso, mas não removi)
    # OBS: seu plan é free/pro/premium — não use "admin" aqui, mas mantive compat.
    plan = str(_get_user_field(user, "plan", "") or "").lower().strip()
    acc_type = str(_get_user_field(user, "account_type", "") or "").lower().strip()
    typ = str(_get_user_field(user, "type", "") or "").lower().strip()

    if plan == "admin" or acc_type == "admin" or typ == "admin":
        return True

    return False


def _require_business_owner(db: Session, business_id: str, user_id: str) -> Business:
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="business not found")
    if biz.ownerId != user_id:
        raise HTTPException(status_code=403, detail="forbidden")
    return biz


# ✅ NOVO (sem apagar nada): mesma lógica, mas com bypass de admin
def _require_business_owner_or_admin(db: Session, business_id: str, user) -> Business:
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="business not found")

    # ✅ ADMIN vê tudo
    if _is_admin(user):
        return biz

    # ✅ usuário normal: precisa ser owner
    user_id = _get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthorized")

    if biz.ownerId != user_id:
        raise HTTPException(status_code=403, detail="forbidden")

    return biz


@router.get("/business/{business_id}")
def business_stats(
    business_id: str,
    days: int = 30,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # ✅ ALTERADO (sem remover a função antiga): agora aceita admin também
    _require_business_owner_or_admin(db, business_id, user)

    days = max(7, min(int(days), 180))
    now = datetime.utcnow()

    daily = []
    total_views = 0
    total_clicks = 0
    total_comparisons = 0

    for i in range(days):
        d = now - timedelta(days=(days - i - 1))
        # números realistas
        views = random.randint(20, 140)
        clicks = random.randint(5, 45)
        comparisons = random.randint(10, 70)

        total_views += views
        total_clicks += clicks
        total_comparisons += comparisons

        daily.append({
            "date": d.strftime("%d/%m"),
            "visualizacoes": views,
            "cliques": clicks,
            "comparacoes": comparisons,
        })

    # cards
    totals = {
        "views": total_views,
        "clicks": total_clicks,
        "comparisons": total_comparisons,
    }

    # top products mock
    top_products = [
        {"name": "Arroz Tipo 1", "views": 234, "clicks": 45, "spent": 850.00},
        {"name": "Feijão Preto", "views": 189, "clicks": 38, "spent": 620.50},
        {"name": "Óleo de Soja", "views": 167, "clicks": 32, "spent": 450.00},
        {"name": "Açúcar Cristal", "views": 145, "clicks": 28, "spent": 380.00},
        {"name": "Café Torrado", "views": 123, "clicks": 25, "spent": 320.75},
    ]

    conversion = [
        {"name": "Visualizações", "value": total_views},
        {"name": "Cliques em detalhes", "value": int(total_clicks * 0.85)},
        {"name": "Rotas iniciadas", "value": int(total_clicks * 0.45)},
        {"name": "Comparações", "value": int(total_comparisons * 0.35)},
    ]

    return {
        "days": days,
        "daily": daily,
        "totals": totals,
        "topProducts": top_products,
        "conversion": conversion,
        "categoryTotals": [
            {"name": "Visualizações", "value": total_views},
            {"name": "Cliques", "value": total_clicks},
            {"name": "Comparações", "value": total_comparisons},
        ],

        # ✅ (NOVO) compatibilidade extra sem quebrar nada
        "views": total_views,
        "clicks": total_clicks,
        "comparisons": total_comparisons,
        "stats": {
            "views": total_views,
            "clicks": total_clicks,
            "comparisons": total_comparisons,
        },
    }
