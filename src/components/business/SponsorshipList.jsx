import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiClient";
import {
  TrendingUp,
  Eye,
  MousePointer,
  Calendar,
  DollarSign,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SponsorshipList({ businessId }) {
  const queryClient = useQueryClient();

  const { data: sponsorships = [], isLoading } = useQuery({
    queryKey: ["sponsorships", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const all = await apiRequest(`/api/sponsorships?businessId=${businessId}`);
      // ordena por createdAt/created_date se existir
      return (all || []).sort((a, b) => {
        const da = new Date(a.createdAt || a.created_date || 0).getTime();
        const db = new Date(b.createdAt || b.created_date || 0).getTime();
        return db - da;
      });
    },
    enabled: !!businessId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest("/api/products"),
  });

  const getProduct = (productId) => products.find((p) => p.id === productId);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return apiRequest(`/api/sponsorships/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "active" ? "Patrocínio retomado" : "Patrocínio pausado");
      queryClient.invalidateQueries({ queryKey: ["sponsorships", businessId] });
      queryClient.invalidateQueries({ queryKey: ["activeSponsorships"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao atualizar status");
    },
  });

  const toggleStatus = (sponsorship) => {
    const newStatus = sponsorship.status === "active" ? "paused" : "active";
    toggleMutation.mutate({ id: sponsorship.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!sponsorships || sponsorships.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">Nenhum patrocínio ativo</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sponsorships.map((sponsorship) => {
        // padroniza productId (caso backend envie product ou productId)
        const productId = sponsorship.productId ?? sponsorship.product;
        const product = getProduct(productId);

        const isActive = sponsorship.status === "active";
        const isPaused = sponsorship.status === "paused";
        const isFinished = sponsorship.status === "finished";

        const endDate = sponsorship.endDate || sponsorship.end_date;
        const daysRemaining = endDate
          ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
          : 0;

        const dailyBudget = Number(sponsorship.dailyBudget ?? sponsorship.daily_budget ?? 0);
        const totalBudget = Number(sponsorship.totalBudget ?? sponsorship.total_budget ?? dailyBudget * (sponsorship.days || 0));
        const impressions = Number(sponsorship.impressions ?? 0);
        const clicks = Number(sponsorship.clicks ?? 0);

        return (
          <div key={sponsorship.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">
                    {product?.name || "Produto"}
                  </h4>

                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : isPaused
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isActive ? "Ativo" : isPaused ? "Pausado" : "Finalizado"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Finalizado"}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    R$ {dailyBudget.toFixed(2)}/dia
                  </span>
                </div>
              </div>

              {!isFinished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatus(sponsorship)}
                  className="ml-2"
                  disabled={toggleMutation.isPending}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                  <span>Investido</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  R$ {totalBudget.toFixed(2)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                  <Eye className="w-3 h-3" />
                  <span>Visualizações</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{impressions}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                  <MousePointer className="w-3 h-3" />
                  <span>Cliques</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{clicks}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
