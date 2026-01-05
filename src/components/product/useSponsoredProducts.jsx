import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiClient";

// Hook para verificar se produtos estão patrocinados
export function useSponsoredProducts() {
  const { data: sponsorships = [] } = useQuery({
    queryKey: ["activeSponsorships"],
    queryFn: async () => {
      try {
        return await apiRequest("/api/sponsorships/active");
      } catch (error) {
        console.error("Erro ao buscar patrocínios ativos:", error);
        return [];
      }
    },
  });

  const isProductSponsored = (productId) => {
    return sponsorships.some(
      (s) => (s.productId ?? s.product) === productId && s.status === "active"
    );
  };

  const getProductSponsorship = (productId) => {
    return sponsorships.find(
      (s) => (s.productId ?? s.product) === productId && s.status === "active"
    );
  };

  return {
    isProductSponsored,
    getProductSponsorship,
    sponsorships,
  };
}
