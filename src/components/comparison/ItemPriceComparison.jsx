import React, { useState } from 'react';
import { TrendingDown, Award, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { checkUserPlan, USER_FEATURES } from '@/components/premium/premiumUtils';
import PremiumUpgradeModal from '@/components/premium/PremiumUpgradeModal';

export default function ItemPriceComparison({ item, markets, products }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check user plan
  const { data: planData } = useQuery({
    queryKey: ['userPlan'],
    queryFn: () => checkUserPlan(),
  });

  const tier = planData?.tier || 'free';
  const features = USER_FEATURES[tier.toUpperCase()] || USER_FEATURES.FREE;
  const canCompareItems = features.ITEM_COMPARISON;

  const product = products.find(p => p.id === item.productId);
  
  if (!product) return null;

  // Find prices across all markets
  const marketPrices = markets.map(market => {
    const itemDetail = market.itemDetails?.find(d => d.productId === item.productId);
    return {
      marketId: market.id,
      marketName: market.name,
      price: itemDetail?.price,
      hasPrice: itemDetail?.hasPrice,
    };
  }).filter(mp => mp.hasPrice);

  if (marketPrices.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-500">{item.quantity}x {product.unit}</p>
          </div>
          <p className="text-sm text-gray-400">Sem preços</p>
        </div>
      </div>
    );
  }

  // Block content if user doesn't have pro plan
  if (!canCompareItems) {
    return (
      <>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-dashed border-gray-300 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40" />
          <div className="relative text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Comparação por Item
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Veja o melhor preço para cada produto
            </p>
            <Button
              size="sm"
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <Crown className="w-3 h-3 mr-1.5" />
              Desbloquear
            </Button>
          </div>
        </div>

        <PremiumUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="item-comparison"
          planType="user"
        />
      </>
    );
  }

  const cheapest = marketPrices.reduce((min, mp) => mp.price < min.price ? mp : min);
  const mostExpensive = marketPrices.reduce((max, mp) => mp.price > max.price ? mp : max);
  const savings = (mostExpensive.price - cheapest.price) * item.quantity;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{product.name}</h4>
          <p className="text-sm text-gray-500">{item.quantity}x {product.unit}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-600">
            R$ {cheapest.price.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">{cheapest.marketName}</p>
        </div>
      </div>

      {savings > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Economiza <span className="font-semibold text-emerald-600">R$ {savings.toFixed(2)}</span> vs mais caro</span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
            <Award className="w-3 h-3" />
            Melhor preço
          </span>
        </div>
      )}

      {/* All prices */}
      <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
        {marketPrices.map(mp => (
          <div key={mp.marketId} className="flex items-center justify-between text-xs">
            <span className={mp.marketId === cheapest.marketId ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
              {mp.marketName}
            </span>
            <span className={mp.marketId === cheapest.marketId ? 'text-emerald-700 font-semibold' : 'text-gray-700'}>
              R$ {mp.price.toFixed(2)}
              {mp.marketId !== cheapest.marketId && (
                <span className="text-red-600 ml-1">+R$ {(mp.price - cheapest.price).toFixed(2)}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}