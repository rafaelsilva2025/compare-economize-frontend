import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Market, Business
from auth_jwt import get_current_user


router = APIRouter(prefix="/markets", tags=["markets"])


# ✅ NOVO (sem apagar nada): helpers para suportar user como dict OU como model
def _get_user_field(user, key: str, default=None):
    try:
        if isinstance(user, dict):
            return user.get(key, default)
        return getattr(user, key, default)
    except Exception:
        return default


def _get_user_id(user) -> str | None:
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


def _is_admin(user) -> bool:
    plan = str(_get_user_field(user, "plan", "") or "").lower().strip()
    acc_type = str(_get_user_field(user, "account_type", "") or "").lower().strip()
    typ = str(_get_user_field(user, "type", "") or "").lower().strip()
    role = str(_get_user_field(user, "role", "") or "").lower().strip()
    accountType = str(_get_user_field(user, "accountType", "") or "").lower().strip()
    email = str(_get_user_field(user, "email", "") or "").lower().strip()

    # ✅ seu admin fixo
    if email == "empresaslim@gmail.com":
        return True

    return (
        plan == "admin"
        or acc_type == "admin"
        or accountType == "admin"
        or typ == "admin"
        or role == "admin"
    )


@router.get("")
def list_markets(businessId: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Market)

    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    # ✅ admin pode ver tudo (se não passar businessId)
    if _is_admin(user) and not businessId:
        items = q.all()
        return [serialize_market(m) for m in items]

    # se vier businessId, valida que é do usuário (ou admin)
    if businessId:
        b = db.query(Business).filter(Business.id == businessId).first()
        if not b:
            return []
        if not _is_admin(user) and b.ownerId != uid:
            raise HTTPException(status_code=403, detail="forbidden")
        q = q.filter(Market.businessId == businessId)
    else:
        # sem businessId, retorna só markets das empresas do user
        # (pra não vazar dados)
        my_business_ids = [b.id for b in db.query(Business).filter(Business.ownerId == uid).all()]
        q = q.filter(Market.businessId.in_(my_business_ids)) if my_business_ids else q.filter(Market.id == "__none__")

    items = q.all()
    return [serialize_market(m) for m in items]


@router.post("")
def create_market(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    businessId = payload.get("businessId")
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")

    b = db.query(Business).filter(Business.id == businessId).first()
    if not b:
        raise HTTPException(status_code=404, detail="business not found")

    # ✅ admin bypass / owner check
    if not _is_admin(user) and b.ownerId != uid:
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
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="market not found")

    # valida dono via business (ou admin)
    if m.businessId:
        b = db.query(Business).filter(Business.id == m.businessId).first()
        if not b:
            raise HTTPException(status_code=403, detail="forbidden")
        if not _is_admin(user) and b.ownerId != uid:
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
