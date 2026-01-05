import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Business, Market
from auth_jwt import get_current_user


router = APIRouter(prefix="/business", tags=["business"])


# =====================================================
# 🔹 NOVO ENDPOINT (alias moderno para o frontend novo)
# GET /api/business/me
# =====================================================
@router.get("/me")
def get_my_business_single(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    b = db.query(Business).filter(Business.ownerId == user["id"]).first()
    return serialize_business(b) if b else None


# =====================================================
# 🔹 ENDPOINT ANTIGO (MANTIDO – NÃO REMOVIDO)
# GET /api/business/my
# =====================================================
@router.get("/my")
def my_business(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = db.query(Business).filter(Business.ownerId == user["id"]).all()
    return [serialize_business(b) for b in items]


# =====================================================
# CREATE BUSINESS
# =====================================================
@router.post("")
def create_business(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    b = Business(
        id=str(uuid.uuid4()),
        ownerId=user["id"],
        name=name,
        category=payload.get("category"),
        contactEmail=payload.get("contactEmail"),
        phone=payload.get("phone"),
        address=payload.get("address"),
        city=payload.get("city"),
        state=payload.get("state"),
        zipCode=payload.get("zipCode"),
        cnpj=payload.get("cnpj"),
        inscricaoEstadual=payload.get("inscricaoEstadual"),
        isVerified=False,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return serialize_business(b)


# =====================================================
# UPDATE BUSINESS
# =====================================================
@router.put("/{business_id}")
def update_business(business_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="business not found")
    if b.ownerId != user["id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    for field in [
        "name", "category", "contactEmail", "phone", "address", "city", "state",
        "zipCode", "cnpj", "inscricaoEstadual"
    ]:
        if field in payload:
            setattr(b, field, payload.get(field))

    db.commit()
    db.refresh(b)
    return serialize_business(b)


# =====================================================
# LIST MARKETS (com ou sem businessId)
# =====================================================
@router.get("/markets")
def list_my_markets(
    businessId: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # se businessId vier, valida dono
    if businessId:
        b = db.query(Business).filter(Business.id == businessId).first()
        if not b:
            return []
        if b.ownerId != user["id"]:
            raise HTTPException(status_code=403, detail="forbidden")
        items = db.query(Market).filter(Market.businessId == businessId).all()
        return [serialize_market(m) for m in items]

    # sem businessId: pega das empresas do user
    my_business_ids = [
        b.id for b in db.query(Business).filter(Business.ownerId == user["id"]).all()
    ]
    if not my_business_ids:
        return []

    items = db.query(Market).filter(Market.businessId.in_(my_business_ids)).all()
    return [serialize_market(m) for m in items]


# =====================================================
# CREATE MARKET
# =====================================================
@router.post("/markets")
def create_market(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    businessId = payload.get("businessId")
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")

    b = db.query(Business).filter(Business.id == businessId).first()
    if not b:
        raise HTTPException(status_code=404, detail="business not found")
    if b.ownerId != user["id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    m = Market(
        id=str(uuid.uuid4()),
        businessId=businessId,
        name=name,
        categorySlug=payload.get("categorySlug"),
        addressLine=payload.get("addressLine"),
        city=payload.get("city"),
        state=payload.get("state"),
        zipCode=payload.get("zipCode"),
        phone=payload.get("phone"),
        email=payload.get("email"),
        cnpj=payload.get("cnpj"),
        inscricaoEstadual=payload.get("inscricaoEstadual"),
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return serialize_market(m)


# =====================================================
# UPDATE MARKET
# =====================================================
@router.put("/markets/{market_id}")
def update_market(market_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="market not found")

    if not m.businessId:
        raise HTTPException(status_code=403, detail="market has no businessId")

    b = db.query(Business).filter(Business.id == m.businessId).first()
    if not b or b.ownerId != user["id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    for field in [
        "name", "categorySlug", "addressLine", "city", "state", "zipCode",
        "phone", "email", "cnpj", "inscricaoEstadual", "latitude", "longitude"
    ]:
        if field in payload:
            setattr(m, field, payload.get(field))

    db.commit()
    db.refresh(m)
    return serialize_market(m)


# =====================================================
# SERIALIZERS (INALTERADOS)
# =====================================================
def serialize_business(b: Business):
    if not b:
        return None
    return {
        "id": b.id,
        "ownerId": b.ownerId,
        "name": b.name,
        "category": b.category,
        "contactEmail": b.contactEmail,
        "phone": b.phone,
        "address": b.address,
        "city": b.city,
        "state": b.state,
        "zipCode": b.zipCode,
        "cnpj": b.cnpj,
        "inscricaoEstadual": b.inscricaoEstadual,
        "isVerified": bool(b.isVerified),
    }


def serialize_market(m: Market):
    return {
        "id": m.id,
        "businessId": m.businessId,
        "name": m.name,
        "categorySlug": m.categorySlug,
        "addressLine": m.addressLine,
        "city": m.city,
        "state": m.state,
        "zipCode": m.zipCode,
        "phone": m.phone,
        "email": m.email,
        "cnpj": m.cnpj,
        "inscricaoEstadual": m.inscricaoEstadual,
        "latitude": m.latitude,
        "longitude": m.longitude,
    }
