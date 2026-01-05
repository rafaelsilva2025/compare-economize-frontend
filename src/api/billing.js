import { apiRequest } from "@/api/apiClient";

/**
 * Cria pagamento no Mercado Pago e devolve init_point
 * backend: POST /api/billing/create
 */
export async function createSubscription({ plan, price }) {
  return apiRequest("/api/billing/create", {
    method: "POST",
    body: JSON.stringify({ plan, price }),
  });
}
