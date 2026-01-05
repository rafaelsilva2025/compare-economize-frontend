import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Crown, Eye, MousePointer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkBusinessPlan, BUSINESS_FEATURES } from "./businessUtils";
import BusinessUpgradeModal from "./BusinessUpgradeModal";
import CreateSponsorshipModal from "./CreateSponsorshipModal";
import SponsoredBadge from "@/components/product/SponsoredBadge";
import { apiRequest } from "@/api/apiClient";

export default function ProductSponsorshipManager({ businessId, marketId }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 🔐 Plano da empresa
  const { data: planData } = useQuery({
    queryKey: ["businessPlan", businessId],
    queryFn: () => checkBusinessPlan(businessId),
    enabled: !!businessId,
  });

  const tier = planData?.tier || "free";
  const canSponsor =
    BUSINESS_FEATURES[tier.toUpperCase()]?.PRODUCT_SPONSORSHIP || false;

  // 💰 Preços do mercado
  const { data: prices = [] } = useQuery({
    queryKey: ["marketPrices", marketId],
    queryFn: async () => {
      if (!marketId) return [];
      return await apiRequest(`/api/prices?marketId=${marketId}`);
    },
    enabled: !!marketId,
  });

  // 📦 Produtos
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest("/api/products"),
  });

  // ⭐ Patrocínios ativos
  const { data: sponsorships = [] } = useQuery({
    queryKey: ["sponsorships", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return await apiRequest(
        `/api/sponsorships?businessId=${businessId}&status=active`
      );
    },
    enabled: !!businessId,
  });

  // Produtos que existem neste mercado
  const marketProducts = products.filter((p) =>
    prices.some((price) => price.productId === p.id)
  );

  const handleSponsorClick = (product) => {
    if (!canSponsor) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedProduct(product);
    setShowCreateModal(true);
  };

  const getProductSponsorship = (productId) => {
    return sponsorships.find((s) => s.productId === productId);
  };

  // 🔒 Caso não possa patrocinar
  if (!canSponsor) {
    return (
      <>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-200">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Patrocine seus produtos
            </h3>
            <p className="text-gray-600 mb-6">
              Destaque produtos nas comparações e aumente suas vendas com o Plano
              Premium
            </p>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              Assinar Premium – R$ 59,90/mês
            </Button>
          </div>
        </div>

        <BusinessUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="sponsor"
          requiredTier="premium"
        />
      </>
    );
  }

  if (marketProducts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">
          Nenhum produto cadastrado neste estabelecimento
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {marketProducts.map((product) => {
          const sponsorship = getProductSponsorship(product.id);
          const price = prices.find((p) => p.productId === product.id);

          const daysRemaining = sponsorship
            ? Math.ceil(
                (new Date(sponsorship.endDate) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {product.name}
                    </h4>
                    {sponsorship && <SponsoredBadge small />}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span>R$ {price?.price?.toFixed(2) || "—"}</span>
                    {product.unit && <span>• {product.unit}</span>}
                  </div>

                  {sponsorship && (
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span>Restam</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {daysRemaining} dias
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <Eye className="w-3 h-3" />
                          <span>Visualizações</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {sponsorship.impressions || 0}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <MousePointer className="w-3 h-3" />
                          <span>Cliques</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {sponsorship.clicks || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={sponsorship ? "outline" : "default"}
                  onClick={() => handleSponsorClick(product)}
                  className={
                    sponsorship
                      ? "ml-3"
                      : "ml-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  }
                  disabled={!!sponsorship}
                >
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                  {sponsorship ? "Patrocinado" : "Patrocinar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateSponsorshipModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedProduct(null);
        }}
        businessId={businessId}
        selectedProductId={selectedProduct?.id}
      />
    </>
  );
}
