import { apiRequest } from "@/api/apiClient";

const STORAGE_PREFIX = "payment_";

export const PRICE_BY_PLAN_CODE = {
  user_pro: 9.9,
  business_pro: 29.9,
  business_premium: 59.9,
};

/* ================================
   Local storage helpers
================================ */
export function getStoredPayment(internalId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${internalId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storePayment(payment) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${payment.internal_id}`,
    JSON.stringify(payment)
  );
}

/* ================================
   CREATE PIX PAYMENT
================================ */
export async function createPixPayment({
  plan_code,
  kind,
  name,
  email,
  user_id,
  business_id,
}) {
  const payload = {
    plan_code,
    kind,
    name,
    email,
    user_id,
    business_id,
  };

  try {
    const payment = await apiRequest("/api/payments/pix/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!payment?.internal_id) {
      throw new Error("Pagamento inválido");
    }

    storePayment(payment);
    return payment;
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    throw error;
  }
}

/* ================================
   CHECK PAYMENT STATUS
================================ */
export async function getPaymentStatus(internalId) {
  try {
    return await apiRequest(`/api/payments/${internalId}`);
  } catch (error) {
    console.error("Erro ao buscar status do pagamento:", error);
    return null;
  }
}

/* ================================
   ACTIVATE SUBSCRIPTION (BACKEND)
================================ */
/**
 * ⚠️ IMPORTANTE:
 * - Essa função APENAS chama o backend
 * - O backend valida pagamento (status=approved)
 * - O backend cancela assinaturas antigas
 * - O backend cria a nova assinatura
 */
export async function activateSubscriptionFromPayment(payment) {
  if (!payment?.internal_id) {
    throw new Error("Pagamento inválido");
  }

  try {
    return await apiRequest("/api/subscriptions/activate", {
      method: "POST",
      body: JSON.stringify({
        payment_id: payment.internal_id,
      }),
    });
  } catch (error) {
    console.error("Erro ao ativar assinatura:", error);
    throw error;
  }
}
