// src/api/ai.js
import { apiRequest } from "./apiClient";

export async function identifyProductsAI({ query, products }) {
  // products: [{ id, name }]
  return apiRequest("/ai/identify-products", {
    method: "POST",
    body: JSON.stringify({
      query,
      products,
    }),
  });
}
