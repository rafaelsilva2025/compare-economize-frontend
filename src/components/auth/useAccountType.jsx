import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiClient";

/**
 * Hook to determine if the current user is a business owner or regular user
 * Returns: { isBusiness: boolean, isUser: boolean, isLoading: boolean, user: object, business: object|null }
 */

// ✅ helper (porque seu apiRequest NÃO tem "params")
function withQuery(path, params) {
  if (!params) return path;
  const qs = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

export function useAccountType() {
  // 1) Usuário logado (pelo token no localStorage)
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        // ✅ FORMATO CERTO: apiRequest(url, options)
        // GET /api/auth/me  -> { id, email, ... }
        return await apiRequest("/api/auth/me", { method: "GET" });
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  // 2) Business do usuário (se existir)
  const { data: businesses = [], isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["userBusinesses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        // ✅ ideal: backend já retornar “minhas empresas”
        // GET /api/business/my -> [ ... ]
        const list = await apiRequest("/api/business/my", { method: "GET" });
        return Array.isArray(list) ? list : [];
      } catch (error) {
        // ✅ fallback opcional se você ainda não tiver /api/business/my:
        // tente buscar por ownerId
        try {
          const url = withQuery("/api/business", { ownerId: user.id });
          const list = await apiRequest(url, { method: "GET" });
          return Array.isArray(list) ? list : [];
        } catch (e2) {
          return [];
        }
      }
    },
    enabled: !!user?.id,
    retry: false,
  });

  const business = businesses[0] || null;
  const isBusiness = !!business;
  const isUser = !isBusiness && !!user;
  const isLoading = isLoadingUser || isLoadingBusiness;

  return {
    isBusiness,
    isUser,
    isLoading,
    user,
    business,
  };
}
