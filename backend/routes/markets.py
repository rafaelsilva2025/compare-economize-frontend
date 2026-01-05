import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Market, Business
from auth_jwt import get_current_user


router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("")
def list_markets(businessId: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Market)

    # se vier businessId, valida que é do usuário
    if businessId:
        b = db.query(Business).filter(Business.id == businessId).first()
        if not b:
            return []
        if b.ownerId != user["id"]:
            raise HTTPException(status_code=403, detail="forbidden")
        q = q.filter(Market.businessId == businessId)
    else:
        # sem businessId, retorna só markets das empresas do user
        # (pra não vazar dados)
        my_business_ids = [b.id for b in db.query(Business).filter(Business.ownerId == user["id"]).all()]
        q = q.filter(Market.businessId.in_(my_business_ids)) if my_business_ids else q.filter(Market.id == "__none__")

    items = q.all()
    return [serialize_market(m) for m in items]


@router.post("")
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


@router.put("/{market_id}")
def update_market(market_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="market not found")

    # valida dono via business
    if m.businessId:
        b = db.query(Business).filter(Business.id == m.businessId).first()
        if not b or b.ownerId != user["id"]:
            raise HTTPException(status_code=403, detail="forbidden")
    else:
        raise HTTPException(status_code=403, detail="market has no businessId")

    for field in [
        "name","categorySlug","addressLine","city","state","zipCode","phone","email",
        "cnpj","inscricaoEstadual","latitude","longitude"
    ]:
        if field in payload:
            setattr(m, field, payload.get(field))

    db.commit()
    db.refresh(m)
    return serialize_market(m)


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
