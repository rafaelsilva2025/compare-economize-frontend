from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
import uuid

from db import get_db
from models import Product, Market, Price

router = APIRouter(prefix="/api", tags=["Data"])


# ---------- Schemas ----------
class ProductIn(BaseModel):
    id: str
    name: str
    unit: Optional[str] = None


class ProductOut(ProductIn):
    pass


class MarketIn(BaseModel):
    id: Optional[str] = None
    businessId: Optional[str] = None

    name: str
    categorySlug: Optional[str] = None

    category: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    addressLine: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None

    cnpj: Optional[str] = None
    inscricaoEstadual: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MarketOut(MarketIn):
    id: str


class PriceIn(BaseModel):
    marketId: str
    productId: str
    price: float


class PriceOut(PriceIn):
    id: int


# ---------- PRODUCTS ----------
@router.get("/products", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.name.asc()).all()
    return rows


@router.post("/products", response_model=ProductOut)
def create_or_update_product(payload: ProductIn, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.id == payload.id).first()
    if existing:
        existing.name = payload.name
        existing.unit = payload.unit
        db.commit()
        db.refresh(existing)
        return existing

    row = Product(id=payload.id, name=payload.name, unit=payload.unit)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------- MARKETS ----------
@router.get("/markets", response_model=List[MarketOut])
def list_markets(
    businessId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Market)
    if businessId:
        q = q.filter(Market.businessId == businessId)
    rows = q.order_by(Market.name.asc()).all()
    return rows


@router.post("/markets", response_model=MarketOut)
def create_market(payload: MarketIn, db: Session = Depends(get_db)):
    row = Market(
        id=payload.id or str(uuid.uuid4()),
        businessId=payload.businessId,
        name=payload.name,
        categorySlug=payload.categorySlug,

        category=payload.category,
        phone=payload.phone,
        email=payload.email,

        addressLine=payload.addressLine,
        city=payload.city,
        state=payload.state,
        zipCode=payload.zipCode,

        cnpj=payload.cnpj,
        inscricaoEstadual=payload.inscricaoEstadual,

        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/markets/{market_id}", response_model=MarketOut)
def update_market(market_id: str, payload: MarketIn, db: Session = Depends(get_db)):
    row = db.query(Market).filter(Market.id == market_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Market não encontrado")

    data = payload.model_dump(exclude_unset=True)
    # não deixa trocar ID
    data.pop("id", None)

    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row


# ---------- PRICES ----------
@router.get("/prices", response_model=List[PriceOut])
def list_prices(
    marketId: Optional[str] = None,
    productId: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Price)
    if marketId:
        q = q.filter(Price.marketId == marketId)
    if productId:
        q = q.filter(Price.productId == productId)

    rows = q.order_by(Price.id.desc()).all()
    return rows


@router.post("/prices", response_model=PriceOut)
def create_or_update_price(payload: PriceIn, db: Session = Depends(get_db)):
    m = db.query(Market).filter(Market.id == payload.marketId).first()
    if not m:
        raise HTTPException(status_code=400, detail="marketId não encontrado")

    p = db.query(Product).filter(Product.id == payload.productId).first()
    if not p:
        raise HTTPException(status_code=400, detail="productId não encontrado")

    existing = (
        db.query(Price)
        .filter(Price.marketId == payload.marketId, Price.productId == payload.productId)
        .first()
    )
    if existing:
        existing.price = payload.price
        db.commit()
        db.refresh(existing)
        return existing

    row = Price(marketId=payload.marketId, productId=payload.productId, price=payload.price)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
