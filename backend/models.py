from sqlalchemy import Column, String, Float, Integer, ForeignKey, UniqueConstraint, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base
import uuid


def gen_uuid() -> str:
    return str(uuid.uuid4())


# =========================
# AUTH / USERS
# =========================
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=gen_uuid)  # ✅ agora gera uuid se não vier
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)

    # "user" | "business"
    accountType = Column(String, nullable=False, default="user")

    # ✅ plano do usuário (PlanRoute lê isso / webhook atualiza isso)
    # free | pro | premium
    plan = Column(String, nullable=False, default="free")

    # ✅ NOVO (não quebra): permite login por e-mail/senha além do Google
    # Se você usa só Google hoje, isso fica NULL e não interfere.
    passwordHash = Column(String, nullable=True)

    # ✅ NOVO (não quebra): controle de permissão / admin
    # role: "user" | "admin"
    role = Column(String, nullable=False, default="user")
    isAdmin = Column(Boolean, nullable=False, default=False)

    # ✅ NOVO (não quebra): confirmação de e-mail por código
    # - Para Google OAuth, você pode marcar emailVerified=True automaticamente no login/cadastro.
    emailVerified = Column(Boolean, nullable=False, default=False)
    emailVerifyCode = Column(String, nullable=True)
    emailVerifyExpiresAt = Column(DateTime(timezone=True), nullable=True)

    # ✅ NOVO (não quebra): auditoria
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    businesses = relationship("Business", back_populates="owner")

    # ✅ NOVO (não quebra): facilita navegar do user -> subscriptions
    subscriptions = relationship("Subscription", back_populates="user", foreign_keys="Subscription.user_id")


# ✅ SESSÃO/TOKEN
class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userId = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    token = Column(String, unique=True, index=True, nullable=False)

    provider = Column(String, nullable=True, default="google")
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    expiresAt = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")


# =========================
# BUSINESS
# =========================
class Business(Base):
    __tablename__ = "businesses"

    id = Column(String, primary_key=True, index=True, default=gen_uuid)  # ✅ gera uuid se não vier
    ownerId = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)
    contactEmail = Column(String, nullable=True)

    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zipCode = Column(String, nullable=True)
    cnpj = Column(String, nullable=True)
    inscricaoEstadual = Column(String, nullable=True)

    isVerified = Column(Boolean, nullable=False, default=False)

    owner = relationship("User", back_populates="businesses")
    markets = relationship("Market", back_populates="business")

    # ✅ NOVO (não quebra): facilita navegar da business -> subscriptions
    subscriptions = relationship("Subscription", back_populates="business", foreign_keys="Subscription.businessId")


# =========================
# PLANS / SUBSCRIPTIONS
# =========================
class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, index=True)  # ex: free/pro/premium
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False, default=0.0)

    # ✅ NOVO (não quebra): facilita navegar do plan -> subscriptions
    subscriptions = relationship("Subscription", back_populates="plan_rel", foreign_keys="Subscription.planId")


class Subscription(Base):
    __tablename__ = "subscriptions"

    # ✅ antes era String sem default → quebrava (id NULL)
    id = Column(String, primary_key=True, index=True, default=gen_uuid)

    # ✅ identifica se é assinatura de "user" ou "business"
    # (não quebra nada, é opcional)
    kind = Column(String, nullable=True, default=None)  # user | business

    # ✅ suporta assinatura por usuário (billing atual usa isso)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=True)

    # ✅ mantém suporte por empresa (se quiser no futuro)
    businessId = Column(String, ForeignKey("businesses.id"), index=True, nullable=True)

    # ✅ modo simples do billing (pro/premium/premium user)
    plan = Column(String, nullable=True)  # pro | premium | premium(user)

    # ✅ mantém modo PlanId também (opcional)
    planId = Column(String, ForeignKey("plans.id"), index=True, nullable=True)

    status = Column(String, nullable=False, default="pending")  # pending/active/canceled
    payment_ref = Column(String, unique=True, index=True, nullable=True)
    amount = Column(Float, nullable=True)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ✅ Ajustado (sem remover nada): relacionamentos com back_populates
    user = relationship("User", back_populates="subscriptions", foreign_keys=[user_id])
    business = relationship("Business", back_populates="subscriptions", foreign_keys=[businessId])
    plan_rel = relationship("Plan", back_populates="subscriptions", foreign_keys=[planId])


# =========================
# SEUS MODELOS ATUAIS
# =========================
class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True, default=gen_uuid)
    name = Column(String, nullable=False, index=True)
    unit = Column(String, nullable=True)


class Market(Base):
    __tablename__ = "markets"

    id = Column(String, primary_key=True, index=True, default=gen_uuid)
    businessId = Column(String, ForeignKey("businesses.id"), index=True, nullable=True)

    name = Column(String, nullable=False, index=True)
    categorySlug = Column(String, nullable=True)
    addressLine = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zipCode = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    cnpj = Column(String, nullable=True)
    inscricaoEstadual = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    business = relationship("Business", back_populates="markets")


class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marketId = Column(String, ForeignKey("markets.id"), nullable=False, index=True)
    productId = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    price = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("marketId", "productId", name="uq_price_market_product"),
    )

    market = relationship("Market")
    product = relationship("Product")
