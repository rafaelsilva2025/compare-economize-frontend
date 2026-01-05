from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from datetime import datetime, timedelta

from db import get_db
from models import Business
from auth_jwt import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


def _require_business_owner(db: Session, business_id: str, user_id: str) -> Business:
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="business not found")
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
    _require_business_owner(db, business_id, user["id"])

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
