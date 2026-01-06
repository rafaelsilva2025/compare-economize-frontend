import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Business, Market
from auth_jwt import get_current_user


router = APIRouter(prefix="/business", tags=["business"])


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


def _is_admin(user) -> bool:
    # aceita vários formatos
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


def _require_owner_or_admin(b: Business, user):
    if not b:
        raise HTTPException(status_code=404, detail="business not found")

    if _is_admin(user):
        return True

    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    if b.ownerId != uid:
        raise HTTPException(status_code=403, detail="forbidden")

    return True


# =====================================================
# 🔹 NOVO ENDPOINT (ADMIN) - lista TODAS as empresas
# GET /api/business/all
# =====================================================
@router.get("/all")
def list_all_businesses(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="forbidden")

    items = db.query(Business).all()
    return [serialize_business(b) for b in items]


# =====================================================
# 🔹 NOVO ENDPOINT (alias moderno para o frontend novo)
# GET /api/business/me
# =====================================================
@router.get("/me")
def get_my_business_single(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    # ✅ admin: pode pegar "a primeira" como compatibilidade (ou retornar None se não existir)
    if _is_admin(user):
        b = db.query(Business).first()
        return serialize_business(b) if b else None

    b = db.query(Business).filter(Business.ownerId == uid).first()
    return serialize_business(b) if b else None


# =====================================================
# 🔹 ENDPOINT ANTIGO (MANTIDO – NÃO REMOVIDO)
# GET /api/business/my
# =====================================================
@router.get("/my")
def my_business(db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    # ✅ admin: vê tudo (útil para testes)
    if _is_admin(user):
        items = db.query(Business).all()
        return [serialize_business(b) for b in items]

    items = db.query(Business).filter(Business.ownerId == uid).all()
    return [serialize_business(b) for b in items]


# =====================================================
# CREATE BUSINESS
# =====================================================
@router.post("")
def create_business(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    b = Business(
        id=str(uuid.uuid4()),
        ownerId=uid,  # ✅ corrigido (funciona dict OU model)
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

    # ✅ admin bypass / owner check
    _require_owner_or_admin(b, user)

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
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    # se businessId vier, valida dono (ou admin)
    if businessId:
        b = db.query(Business).filter(Business.id == businessId).first()
        if not b:
            return []

        # ✅ admin vê tudo
        if not _is_admin(user) and b.ownerId != uid:
            raise HTTPException(status_code=403, detail="forbidden")

        items = db.query(Market).filter(Market.businessId == businessId).all()
        return [serialize_market(m) for m in items]

    # sem businessId:
    # ✅ admin: lista tudo
    if _is_admin(user):
        items = db.query(Market).all()
        return [serialize_market(m) for m in items]

    # usuário normal: pega das empresas do user
    my_business_ids = [
        b.id for b in db.query(Business).filter(Business.ownerId == uid).all()
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


# =====================================================
# UPDATE MARKET
# =====================================================
@router.put("/markets/{market_id}")
def update_market(market_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = _get_user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="unauthorized")

    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="market not found")

    if not m.businessId:
        raise HTTPException(status_code=403, detail="market has no businessId")

    b = db.query(Business).filter(Business.id == m.businessId).first()

    # ✅ admin bypass / owner check
    if not b:
        raise HTTPException(status_code=403, detail="forbidden")
    if not _is_admin(user) and b.ownerId != uid:
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
