import { api } from "./http";

// categorias
export const getCategories = async () => {
  const { data } = await api.get("/api/categories");
  return data;
};

// lugares por categoria
export const getPlaces = async (categoryId) => {
  const { data } = await api.get("/api/places", { params: { categoryId } });
  return data;
};

// produtos de um lugar
export const getPlaceProducts = async (placeId) => {
  const { data } = await api.get(`/api/place/${placeId}/products`);
  return data;
};

// auth
export const register = async (payload) => {
  const { data } = await api.post("/api/auth/register", payload);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post("/api/auth/login", payload);
  return data; // deve vir token aqui
};

// assinatura/pagamento
export const createSubscription = async (payload) => {
  const { data } = await api.post("/api/subscription/create", payload);
  return data; // payment_ref, valor, etc
};
