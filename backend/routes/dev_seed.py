from fastapi import APIRouter
from db import SessionLocal
from models import Market  # se der erro aqui, me manda seu models.py que eu ajusto

router = APIRouter(prefix="/dev", tags=["Dev"])

@router.post("/seed-markets")
def seed_markets():
    db = SessionLocal()

    # evita duplicar seed toda vez
    if db.query(Market).count() > 0:
        db.close()
        return {"ok": True, "message": "Já existem mercados no banco."}

    markets = [
        Market(
            name="Supermercado Extra",
            categorySlug="mercado",
            latitude=-23.5505,
            longitude=-46.6333,
        ),
        Market(
            name="Carrefour Express",
            categorySlug="mercado",
            latitude=-23.5489,
            longitude=-46.6388,
        ),
        Market(
            name="Altas Horas",
            categorySlug="conveniencia",
            latitude=-23.5522,
            longitude=-46.6311,
        ),
    ]

    db.add_all(markets)
    db.commit()
    db.close()

    return {"ok": True, "inserted": len(markets)}
