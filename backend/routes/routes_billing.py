import os
import uuid
import hmac
import hashlib
import traceback  # ✅ NOVO
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse  # ✅ NOVO
from sqlalchemy.orm import Session

from db import get_db
from models import User, Subscription
from auth_jwt import get_current_user

import mercadopago

router = APIRouter(prefix="/api/billing", tags=["Billing"])

# 🔐 Mercado Pago
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
if not MP_ACCESS_TOKEN:
    raise RuntimeError("MP_ACCESS_TOKEN não configurado no .env")

# ✅ dica: token válido MP normalmente começa com "TEST-" ou "APP_USR-"
# Se estiver parecendo JWT (eyJ...), é quase certeza que você colou o token errado aqui.
if str(MP_ACCESS_TOKEN).strip().startswith("eyJ"):
    raise RuntimeError(
        "MP_ACCESS_TOKEN parece um JWT (eyJ...). "
        "Use o Access Token do Mercado Pago (TEST-... ou APP_USR-...)."
    )

# ✅ PRODUÇÃO: garante que você não está rodando com TEST-
# (mantém compatível com sandbox, mas impede você de "achar" que é produção quando não é)
if str(MP_ACCESS_TOKEN).strip().startswith("TEST-"):
    raise RuntimeError(
        "Você está com MP_ACCESS_TOKEN de TESTE (TEST-...). "
        "Para PRODUÇÃO use APP_USR-... em MP_ACCESS_TOKEN no .env."
    )

sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# ✅ Fallbacks seguros (evita None quebrar string)
FRONTEND_URL = (os.getenv("FRONTEND_URL") or "http://localhost:5173").strip().rstrip("/")
MP_WEBHOOK_URL = (os.getenv("MP_WEBHOOK_URL") or "").strip()

# ✅ (OPCIONAL) Secret do webhook configurado no painel do MP
# Se você preencher esse secret no .env, o webhook valida assinatura.
MP_WEBHOOK_SECRET = (os.getenv("MP_WEBHOOK_SECRET") or "").strip()

# ✅ garante URL absoluta (MP rejeita url sem http/https)
if FRONTEND_URL and not (FRONTEND_URL.startswith("http://") or FRONTEND_URL.startswith("https://")):
    FRONTEND_URL = "http://" + FRONTEND_URL.lstrip("/")


def _subscription_kwargs_safe(data: dict) -> dict:
    """
    Evita quebrar caso seu model Subscription não tenha algum campo.
    Só passa kwargs que realmente existem como coluna na tabela.
    """
    try:
        cols = {c.name for c in Subscription.__table__.columns}
        return {k: v for k, v in data.items() if k in cols}
    except Exception:
        # fallback: se por algum motivo não tiver __table__
        return data


def _build_preference(*, title: str, price_float: float, payer_email: str, payment_ref: str, metadata: dict | None = None):
    """
    Cria o payload da preferência do Mercado Pago com URLs corretas
    """
    # ✅ URLs de retorno (ABSOLUTAS e válidas)
    success_url = f"{FRONTEND_URL}/PagamentoSucesso"
    failure_url = f"{FRONTEND_URL}/PagamentoErro"
    pending_url = f"{FRONTEND_URL}/Pagamento"

    # ✅ garante email string (MP pode rejeitar None)
    payer_email = (payer_email or "").strip() or "cliente@compareeconomize.com"

    preference = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": price_float,
            }
        ],
        # ⚠️ NÃO removi nada: só tirei daqui e vou adicionar abaixo condicionalmente
        # "payer": {"email": payer_email},
        "external_reference": payment_ref,

        # ✅ mantemos sem auto_return (você já comentou o motivo)
        # "auto_return": "approved",

        "back_urls": {
            "success": success_url,
            "failure": failure_url,
            "pending": pending_url,
        },
    }

    # ✅ PRODUÇÃO: sempre envia payer (evita comportamento estranho do checkout e ajuda no antifraude)
    preference["payer"] = {"email": payer_email}

    # ✅ metadata ajuda MUITO pra identificar se é user ou business no webhook
    if metadata and isinstance(metadata, dict):
        preference["metadata"] = metadata

    # ✅ só inclui webhook se você setou no .env
    # (IMPORTANTE: precisa ser URL pública HTTPS em produção)
    if MP_WEBHOOK_URL:
        preference["notification_url"] = MP_WEBHOOK_URL

    return preference


def _extract_mp_event_kind(payload: dict, request: Request) -> str:
    """
    Mercado Pago pode mandar:
    - payload.type = "payment"
    - payload.topic = "payment"
    - payload.action = "payment.updated"
    - query param topic=payment
    """
    msg_type = payload.get("type") or payload.get("topic") or request.query_params.get("topic") or ""
    msg_type = str(msg_type).strip().lower()

    action = payload.get("action") or ""
    action = str(action).strip().lower()

    # ✅ No painel novo, vem "type":"payment" e action:"payment.updated"
    if msg_type:
        return msg_type

    if action.startswith("payment."):
        return "payment"

    return ""


def _extract_payment_id(payload: dict, request: Request) -> str | None:
    """
    Pode vir como:
    - payload.data.id
    - payload.id
    - query param id=...
    - query param "data.id" (raríssimo, mas já vi)
    """
    pid = None

    # JSON padrão
    try:
        pid = payload.get("data", {}).get("id")
    except Exception:
        pid = None

    # alguns payloads mandam id no root
    if not pid:
        pid = payload.get("id")

    # querystring
    if not pid:
        pid = request.query_params.get("id")

    # fallback raro
    if not pid:
        pid = request.query_params.get("data.id")

    if pid is None:
        return None

    return str(pid).strip() or None


def _verify_mp_signature_if_possible(request: Request, raw_body: bytes) -> bool:
    """
    ✅ Verificação opcional de assinatura:
    - Só valida se MP_WEBHOOK_SECRET estiver configurado.
    - Se não estiver, retorna True (não bloqueia seu teste local).

    Observação: O Mercado Pago usa headers como:
      x-signature: ts=...,v1=...
      x-request-id: ...
    e o secret definido no painel de webhooks.
    """
    if not MP_WEBHOOK_SECRET:
        return True

    x_signature = request.headers.get("x-signature") or request.headers.get("X-Signature")
    x_request_id = request.headers.get("x-request-id") or request.headers.get("X-Request-Id")

    if not x_signature or not x_request_id:
        # se você ativar secret e o header não vier, rejeita
        return False

    # parse "ts=...,v1=..."
    parts = {}
    try:
        for item in x_signature.split(","):
            k, v = item.split("=", 1)
            parts[k.strip()] = v.strip()
    except Exception:
        return False

    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False

    # string a assinar (padrão comum do MP)
    signed_payload = f"{ts}.{x_request_id}.{raw_body.decode('utf-8', errors='replace')}".encode("utf-8")

    expected = hmac.new(
        MP_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    # comparação segura
    return hmac.compare_digest(expected, v1)


# 💳 Criar assinatura (EMPRESA - Pro / Premium)
@router.post("/create")
def create_subscription(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    data esperado:
    {
      "plan": "pro" | "premium",
      "price": 59.90
    }
    """

    plan = data.get("plan")
    price = data.get("price")

    if plan not in ["pro", "premium"]:
        raise HTTPException(status_code=400, detail="Plano inválido")

    if price is None:
        raise HTTPException(status_code=400, detail="Price é obrigatório")

    try:
        price_float = float(price)
    except Exception:
        raise HTTPException(status_code=400, detail="Price inválido (use número)")

    if price_float <= 0:
        raise HTTPException(status_code=400, detail="Price deve ser maior que zero")

    # ✅ PRODUÇÃO: força valores pequenos conforme você pediu
    # - empresa pro: 1,01
    # - empresa premium: 1,02
    if plan == "pro":
        price_float = 1.01
    elif plan == "premium":
        price_float = 1.02

    payment_ref = str(uuid.uuid4())

    preference = _build_preference(
        title=f"Plano {plan.title()} - CompareEconomize (Empresa)",
        price_float=price_float,
        payer_email=getattr(user, "email", None),
        payment_ref=payment_ref,
        metadata={
            "kind": "business",
            "plan": plan,
            "user_id": getattr(user, "id", None),
        },
    )

    # 1) cria preferência no MP
    try:
        mp_response = sdk.preference().create(preference)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro MP (SDK): {str(e)}")

    status_code = mp_response.get("status")
    resp = mp_response.get("response") or {}

    if status_code != 201:
        raise HTTPException(
            status_code=500,
            detail={
                "msg": "Erro ao criar pagamento no Mercado Pago",
                "mp_status": status_code,
                "mp_response": resp,
                "debug_urls": {
                    "FRONTEND_URL": FRONTEND_URL,
                    "success": f"{FRONTEND_URL}/PagamentoSucesso",
                    "failure": f"{FRONTEND_URL}/PagamentoErro",
                    "pending": f"{FRONTEND_URL}/Pagamento",
                },
            },
        )

    # ✅ PRODUÇÃO: usa init_point (produção)
    init_point = resp.get("init_point") or resp.get("sandbox_init_point")

    if not init_point:
        raise HTTPException(
            status_code=500,
            detail={"msg": "Mercado Pago não retornou init_point", "mp_response": resp},
        )

    # 2) salva como pendente no banco (sem quebrar se o model tiver campos diferentes)
    try:
        sub_data = {
            "user_id": getattr(user, "id", None),
            "plan": plan,
            "status": "pending",
            "payment_ref": payment_ref,
            "amount": price_float,

            # ✅ extras opcionais (só entram se existirem no model)
            "kind": "business",
        }

        subscription = Subscription(**_subscription_kwargs_safe(sub_data))
        db.add(subscription)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar Subscription no banco: {str(e)}")

    return {
        "init_point": init_point,
        "payment_ref": payment_ref,
    }


# ✅ NOVO: Criar assinatura (USUÁRIO - Premium)
@router.post("/create-user")
def create_user_subscription(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    data esperado:
    {
      "plan": "premium",
      "price": 9.90
    }
    """

    plan = (data.get("plan") or "").lower().strip()
    price = data.get("price")

    # ✅ só premium para usuário (por enquanto)
    if plan not in ["premium"]:
        raise HTTPException(status_code=400, detail="Plano de usuário inválido")

    if price is None:
        raise HTTPException(status_code=400, detail="Price é obrigatório")

    try:
        price_float = float(price)
    except Exception:
        raise HTTPException(status_code=400, detail="Price inválido (use número)")

    if price_float <= 0:
        raise HTTPException(status_code=400, detail="Price deve ser maior que zero")

    # ✅ PRODUÇÃO: força valor pequeno conforme você pediu (usuário: 1,00)
    price_float = 1.00

    payment_ref = str(uuid.uuid4())

    preference = _build_preference(
        title="Plano Premium - CompareEconomize (Usuário)",
        price_float=price_float,
        payer_email=getattr(user, "email", None),
        payment_ref=payment_ref,
        metadata={
            "kind": "user",
            "plan": "premium",
            "user_id": getattr(user, "id", None),
        },
    )

    # 1) cria preferência no MP
    try:
        mp_response = sdk.preference().create(preference)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro MP (SDK): {str(e)}")

    status_code = mp_response.get("status")
    resp = mp_response.get("response") or {}

    if status_code != 201:
        raise HTTPException(
            status_code=500,
            detail={
                "msg": "Erro ao criar pagamento no Mercado Pago (USER)",
                "mp_status": status_code,
                "mp_response": resp,
            },
        )

    # ✅ PRODUÇÃO: usa init_point (produção)
    init_point = resp.get("init_point") or resp.get("sandbox_init_point")

    if not init_point:
        raise HTTPException(
            status_code=500,
            detail={"msg": "Mercado Pago não retornou init_point", "mp_response": resp},
        )

    # 2) salva pendente
    try:
        sub_data = {
            "user_id": getattr(user, "id", None),
            "plan": "premium",
            "status": "pending",
            "payment_ref": payment_ref,
            "amount": price_float,

            # ✅ extras opcionais (só entram se existirem no model)
            "kind": "user",
        }

        subscription = Subscription(**_subscription_kwargs_safe(sub_data))
        db.add(subscription)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar Subscription no banco: {str(e)}")

    return {
        "init_point": init_point,
        "payment_ref": payment_ref,
    }


# 🔔 Webhook Mercado Pago
@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    ✅ ATUALIZADO:
    - Nunca deixa exception virar 500 pro Mercado Pago
    - Ignora ID fake do teste (123456)
    - Converte payment_id para int de forma segura antes do sdk.payment().get
    """
    try:
        # ✅ lê raw body (pra permitir validar assinatura e também parse robusto)
        raw_body = b""
        try:
            raw_body = await request.body()
        except Exception:
            raw_body = b""

        # ✅ pode vir JSON ou vazio (querystring)
        payload = {}
        if raw_body:
            try:
                payload = await request.json()
            except Exception:
                payload = {}
        else:
            payload = {}

        # ✅ log mínimo pra você ver no terminal o que chegou
        print("✅ MP WEBHOOK RECEBIDO:", payload)

        # ✅ (OPCIONAL) valida assinatura se você configurou MP_WEBHOOK_SECRET
        if MP_WEBHOOK_SECRET:
            ok_sig = _verify_mp_signature_if_possible(request, raw_body or b"{}")
            if not ok_sig:
                return JSONResponse({"status": "invalid_signature"}, status_code=200)

        # ✅ Mercado Pago pode mandar:
        msg_type = _extract_mp_event_kind(payload, request)

        if msg_type != "payment":
            return JSONResponse({"status": "ignored", "msg_type": msg_type or None}, status_code=200)

        payment_id = _extract_payment_id(payload, request)

        if not payment_id:
            return JSONResponse({"status": "no_payment_id"}, status_code=200)

        # ✅ TESTE do painel do Mercado Pago sempre usa id fake 123456
        if str(payment_id).strip() == "123456":
            return JSONResponse({"status": "test_ignored", "payment_id": "123456"}, status_code=200)

        # ✅ converte pra int (SDK costuma esperar número)
        try:
            payment_id_int = int(str(payment_id).strip())
        except Exception:
            return JSONResponse({"status": "invalid_payment_id", "payment_id": str(payment_id)}, status_code=200)

        # ✅ busca o pagamento real no MP (fonte da verdade)
        try:
            payment = sdk.payment().get(payment_id_int)
        except Exception as e:
            return JSONResponse(
                {"status": "mp_payment_get_error", "detail": str(e), "payment_id": str(payment_id)},
                status_code=200
            )

        payment_resp = payment.get("response") or {}
        status = (payment_resp.get("status") or "").lower().strip()
        reference = payment_resp.get("external_reference")

        # ✅ tenta ler metadata (se vier)
        metadata = payment_resp.get("metadata") or {}
        kind = (metadata.get("kind") or "").lower().strip()
        plan = (metadata.get("plan") or "").lower().strip()
        meta_user_id = metadata.get("user_id")

        if not reference:
            return JSONResponse({"status": "no_external_reference", "payment_id": str(payment_id)}, status_code=200)

        subscription = (
            db.query(Subscription)
            .filter(Subscription.payment_ref == reference)
            .first()
        )

        if not subscription:
            return JSONResponse({"status": "subscription_not_found", "reference": reference}, status_code=200)

        # ✅ processa estados
        if status == "approved":
            subscription.status = "active"

            # ✅ Atualiza usuário se existir user_id na Subscription (ou metadata)
            try:
                target_user_id = getattr(subscription, "user_id", None) or meta_user_id
                if target_user_id:
                    user = db.query(User).get(target_user_id)

                    # ✅ se existir campo plan, atualiza (libera o front)
                    if user and hasattr(user, "plan"):
                        final_plan = plan or getattr(subscription, "plan", None)

                        # fallback seguro
                        if not final_plan:
                            final_plan = "premium" if kind == "user" else "pro"

                        user.plan = final_plan

                db.commit()
            except Exception as e:
                db.rollback()
                return JSONResponse({"status": "db_update_error", "detail": str(e)}, status_code=200)

            return JSONResponse({"status": "ok", "updated": True, "payment_status": status}, status_code=200)

        # ✅ opcional: se quiser refletir cancelamento automaticamente
        if status in ["cancelled", "refunded", "charged_back"]:
            try:
                subscription.status = "canceled"
                db.commit()
            except Exception as e:
                db.rollback()
                return JSONResponse({"status": "db_update_error", "detail": str(e)}, status_code=200)
            return JSONResponse({"status": "ok", "updated": True, "payment_status": status}, status_code=200)

        return JSONResponse({"status": "ok", "updated": False, "payment_status": status}, status_code=200)

    except Exception as e:
        # ✅ GARANTIA FINAL: nunca deixe virar 500 pro Mercado Pago
        print("❌ ERRO GERAL NO WEBHOOK:", str(e))
        traceback.print_exc()
        return JSONResponse({"status": "handled_error", "detail": str(e)}, status_code=200)
