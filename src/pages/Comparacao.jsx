import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, TrendingUp, Filter, Check, Save, Navigation, ChevronRight, AlertCircle, Award, Star, Package, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import SaveComparisonModal from '@/components/economy/SaveComparisonModal';
import { useUserLocation, getDistanceFromUser } from '@/components/location/useUserLocation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import SkeletonCard from '@/components/loading/SkeletonCard';
import ItemPriceComparison from '@/components/comparison/ItemPriceComparison';
import PremiumBanner from '@/components/premium/PremiumBanner';
import { checkPremium } from '@/components/premium/premiumUtils';
import { useSponsoredProducts } from '@/components/product/useSponsoredProducts';
import SponsoredBadge from '@/components/product/SponsoredBadge';

// Mock data
const mockMarkets = [
  { id: '1', name: 'Supermercado Extra', distance: 0.8, total: 0, isOpen: true },
  { id: '2', name: 'Carrefour Express', distance: 1.2, total: 0, isOpen: true },
  { id: '3', name: 'Pão de Açúcar', distance: 2.1, total: 0, isOpen: true },
];

const marketPrices = {
  '1': { 'p1': 23.90, 'p2': 7.99, 'p3': 4.79, 'p4': 7.49, 'p5': 4.99, 'p6': 14.90, 'p7': 3.99, 'p8': 3.49, 'p9': 11.90, 'p10': 17.90 },
  '2': { 'p1': 24.90, 'p2': 8.49, 'p3': 4.99, 'p4': 7.89, 'p5': 5.29, 'p6': 15.90, 'p7': 4.49, 'p8': 3.99, 'p9': 12.90, 'p10': 18.90 },
  '3': { 'p1': 25.90, 'p2': 8.99, 'p3': 5.29, 'p4': 8.29, 'p5': 5.49, 'p6': 16.90, 'p7': 4.79, 'p8': 4.29, 'p9': 13.90, 'p10': 19.90 },
};

export default function Comparacao() {
  const [listItems, setListItems] = useState([]);
  const [sortBy, setSortBy] = useState('price'); // 'price', 'distance', or 'value'
  const [markets, setMarkets] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsMarket, setDetailsMarket] = useState(null);
  const [showItemComparison, setShowItemComparison] = useState(false);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  
  const { coords: userLocation } = useUserLocation();
  const { isProductSponsored } = useSponsoredProducts();

  // Check premium status
  useEffect(() => {
    checkPremium().then(setIsPremium);
  }, []);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  // Fetch favorite markets
  const { data: favoriteMarkets = [] } = useQuery({
    queryKey: ['favoriteMarkets'],
    queryFn: async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        let user = null;
        
        try {
          user = await base44.auth.me();
        } catch (error) {
          // Not authenticated
        }

        if (user) {
          return await base44.entities.FavoriteMarket.filter({ user: user.id });
        } else if (sessionId) {
          return await base44.entities.FavoriteMarket.filter({ sessionId });
        }
        return [];
      } catch (error) {
        return [];
      }
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem('shoppingList');
    if (saved) {
      setListItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    setIsCalculating(true);
    
    // Simulate calculation delay for better UX
    const timer = setTimeout(() => {
      setIsCalculating(false);
    }, 800);

    // Calculate totals for each market
    const marketsWithTotals = mockMarkets.map(market => {
      let total = 0;
      let itemsWithPrice = 0;
      
      const itemDetails = listItems.map(item => {
        const price = marketPrices[market.id]?.[item.productId];
        const hasPrice = price !== undefined && price !== null;
        
        if (hasPrice) {
          total += price * item.quantity;
          itemsWithPrice++;
        }
        
        return {
          ...item,
          price,
          hasPrice,
          subtotal: hasPrice ? price * item.quantity : 0,
        };
      });
      
      // Calculate distance if user location available
      const calculatedDistance = userLocation && market.latitude && market.longitude
        ? getDistanceFromUser(userLocation, market.latitude, market.longitude)
        : market.distance;
      
      const isComplete = itemsWithPrice === listItems.length;
      
      return { 
        ...market, 
        total, 
        calculatedDistance,
        itemsWithPrice,
        totalItems: listItems.length,
        isComplete,
        itemDetails,
      };
    });

    // Sort markets with favorites priority
    const favoriteMarketIds = favoriteMarkets.map(f => f.market);
    
    const sorted = [...marketsWithTotals].sort((a, b) => {
      // Prioritize favorites
      const aIsFav = favoriteMarketIds.includes(a.id);
      const bIsFav = favoriteMarketIds.includes(b.id);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      
      // Always prioritize complete markets
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      
      if (sortBy === 'price') {
        return a.total - b.total;
      } else if (sortBy === 'distance') {
        const distA = a.calculatedDistance ?? 999;
        const distB = b.calculatedDistance ?? 999;
        return distA - distB;
      } else if (sortBy === 'value') {
        // Cost-benefit score: savings - (distance * 0.50)
        const cheapest = Math.min(...marketsWithTotals.map(m => m.total));
        const scoreA = (a.total - cheapest) - ((a.calculatedDistance ?? 999) * 0.50);
        const scoreB = (b.total - cheapest) - ((b.calculatedDistance ?? 999) * 0.50);
        return scoreA - scoreB;
      }
      return 0;
    });

    setMarkets(sorted);
    
    return () => clearTimeout(timer);
  }, [listItems, sortBy, userLocation]);

  const cheapestMarket = markets.find(m => m.isComplete);
  const mostExpensive = [...markets].filter(m => m.isComplete).reverse()[0];
  const savings = mostExpensive && cheapestMarket ? mostExpensive.total - cheapestMarket.total : 0;
  const savingsPercent = cheapestMarket ? (savings / cheapestMarket.total) * 100 : 0;
  
  const totalItemsInList = listItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  // Find closest and most complete
  const closestMarket = [...markets].sort((a, b) => {
    const distA = a.calculatedDistance ?? 999;
    const distB = b.calculatedDistance ?? 999;
    return distA - distB;
  })[0];
  
  const mostCompleteMarket = [...markets].sort((a, b) => b.itemsWithPrice - a.itemsWithPrice)[0];
  
  // Best value (cost-benefit)
  const bestValueMarket = cheapestMarket && closestMarket ? 
    (cheapestMarket.calculatedDistance && cheapestMarket.calculatedDistance < 5 ? cheapestMarket : closestMarket) 
    : cheapestMarket;

  const handleSaveComparison = (market) => {
    if (!market.isComplete) {
      toast.error('Este local não tem preços para todos os itens da sua lista');
      return;
    }
    setSelectedMarket(market);
    setShowSaveModal(true);
  };

  const handleViewDetails = (market) => {
    setDetailsMarket(market);
    setShowDetailsModal(true);
  };

  if (listItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lista vazia</h2>
          <p className="text-gray-500 mb-6">Crie sua lista para começar a comparar</p>
          <Link to={createPageUrl('MinhaLista')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Ir para minha lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('MinhaLista')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Comparação</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white mb-6 shadow-lg shadow-emerald-200"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-emerald-100 text-xs mb-1">Total da lista</p>
              <p className="text-2xl font-bold">R$ {cheapestMarket?.total.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs mb-1">Melhor opção</p>
              <p className="text-lg font-semibold truncate">{cheapestMarket?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs mb-1">Economia</p>
              <p className="text-2xl font-bold flex items-center gap-1.5">
                <TrendingUp className="w-6 h-6" />
                R$ {savings.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-emerald-100 text-xs mb-1">% de economia</p>
              <p className="text-2xl font-bold">{savingsPercent.toFixed(0)}%</p>
            </div>
          </div>
          {markets.some(m => !m.isComplete) && (
            <div className="mt-4 pt-4 border-t border-emerald-400/30 flex items-center gap-2 text-emerald-100 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Alguns locais não têm preços completos</span>
            </div>
          )}
        </motion.div>

        {/* Recommendations */}
        {!isCalculating && cheapestMarket && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 border border-emerald-200 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Recomendações</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-emerald-900 mb-0.5">Mais barato</p>
                <p className="text-xs text-emerald-700 truncate">{cheapestMarket.name}</p>
              </div>
              {closestMarket && (
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-blue-900 mb-0.5">Mais perto</p>
                  <p className="text-xs text-blue-700 truncate">{closestMarket.name}</p>
                </div>
              )}
              {mostCompleteMarket && (
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <Package className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-purple-900 mb-0.5">Mais completo</p>
                  <p className="text-xs text-purple-700 truncate">{mostCompleteMarket.name}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSortBy('price')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm ${
              sortBy === 'price' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Barato
          </button>
          <button
            onClick={() => setSortBy('distance')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm ${
              sortBy === 'distance' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Perto
          </button>
          <button
            onClick={() => setSortBy('value')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm ${
              sortBy === 'value' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Valor
          </button>
        </div>

        {/* Item-by-item comparison */}
        {!isCalculating && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Comparação por item</h3>
                {!isPremium && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium rounded-full">
                    Premium
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {listItems.length} {listItems.length === 1 ? 'produto' : 'produtos'}
              </span>
            </div>
            {isPremium ? (
              <div className="space-y-3">
                {listItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ItemPriceComparison
                      item={item}
                      markets={markets}
                      products={products}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="blur-sm pointer-events-none">
                  <ItemPriceComparison
                    item={listItems[0]}
                    markets={markets}
                    products={products}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link to={createPageUrl('Planos')}>
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg">
                      Desbloquear com Premium
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Markets List */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Resumo por local</h3>
          <div className="space-y-3">
            {isCalculating ? (
              <>
                <SkeletonCard variant="market" />
                <SkeletonCard variant="market" />
                <SkeletonCard variant="market" />
              </>
            ) : markets.map((market, i) => {
            const isBest = i === 0;
            const diffFromBest = cheapestMarket ? market.total - cheapestMarket.total : 0;
            const isFavorite = favoriteMarkets.some(f => f.market === market.id);
            
            // Determine recommendation badges
            const isCheapest = cheapestMarket && market.id === cheapestMarket.id;
            const isClosest = closestMarket && market.id === closestMarket.id;
            const isMostComplete = mostCompleteMarket && market.id === mostCompleteMarket.id && market.isComplete;
            const isBestValue = bestValueMarket && market.id === bestValueMarket.id;
            
            const badges = [];
            if (isFavorite) badges.push({ label: 'Favorito', color: 'red', icon: 'heart' });
            if (isCheapest) badges.push({ label: 'Mais barato', color: 'emerald' });
            if (isClosest && market.calculatedDistance) badges.push({ label: 'Mais perto', color: 'blue' });
            if (isBestValue && !isCheapest) badges.push({ label: 'Melhor custo-benefício', color: 'purple' });
            if (isMostComplete && badges.length === 0) badges.push({ label: 'Mais completo', color: 'amber' });
            
            return (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                  isBest ? 'border-emerald-200 ring-2 ring-emerald-100 shadow-md' : 'border-gray-100'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{market.name}</h3>
                        {badges.map((badge, idx) => (
                          <span 
                            key={idx}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${
                              badge.color === 'red' ? 'bg-red-50 text-red-700' :
                              badge.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                              badge.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                              badge.color === 'purple' ? 'bg-purple-50 text-purple-700' :
                              'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {badge.icon === 'heart' && <Heart className="w-3 h-3 fill-current" />}
                            {badge.color === 'emerald' && <TrendingUp className="w-3 h-3" />}
                            {badge.color === 'blue' && <MapPin className="w-3 h-3" />}
                            {badge.color === 'purple' && <Award className="w-3 h-3" />}
                            {badge.color === 'amber' && <Check className="w-3 h-3" />}
                            {badge.label}
                          </span>
                        ))}
                        {!market.isComplete && badges.length === 0 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            {market.itemsWithPrice}/{market.totalItems} itens
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {market.calculatedDistance?.toFixed(1) || market.distance} km
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full ${
                          market.isOpen 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {market.isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>
                      
                      {diffFromBest > 0 && (
                        <p className="text-xs text-gray-500">
                          Diferença: <span className="text-red-600 font-medium">+R$ {diffFromBest.toFixed(2)}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">{market.isComplete ? 'Total' : 'Estimado'}</p>
                      <p className={`text-xl font-bold ${isBest ? 'text-emerald-600' : 'text-gray-900'}`}>
                        R$ {market.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(market)}
                      className="flex-1 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      Ver detalhes
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveComparison(market)}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{detailsMarket?.name}</DialogTitle>
          </DialogHeader>
          
          {detailsMarket && (
            <div className="mt-4 space-y-3">
              {/* Summary */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-emerald-700">Total</span>
                  <span className="text-2xl font-bold text-emerald-900">
                    R$ {detailsMarket.total.toFixed(2)}
                  </span>
                </div>
                {!detailsMarket.isComplete && (
                  <p className="text-xs text-emerald-600">
                    {detailsMarket.itemsWithPrice} de {detailsMarket.totalItems} itens com preço
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Itens da lista</h4>
                {detailsMarket.itemDetails.map((item, idx) => {
                  const isBiggestImpact = item.hasPrice && 
                    item.subtotal === Math.max(...detailsMarket.itemDetails.filter(d => d.hasPrice).map(d => d.subtotal));
                  const isSponsored = isProductSponsored(item.productId);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        !item.hasPrice 
                          ? 'bg-gray-50 border-gray-200' 
                          : isBiggestImpact
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">
                              {item.productId}
                            </p>
                            {isSponsored && <SponsoredBadge small />}
                            {isBiggestImpact && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                Maior impacto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {item.quantity}x {item.hasPrice ? `R$ ${item.price.toFixed(2)}` : 'Sem preço'}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold ${
                          item.hasPrice ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {item.hasPrice ? `R$ ${item.subtotal.toFixed(2)}` : '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleSaveComparison(detailsMarket);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  Salvar comparação
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Comparison Modal */}
      {selectedMarket && (
        <SaveComparisonModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          marketChosen={selectedMarket.name}
          totalChosen={selectedMarket.total}
          totalCheapest={cheapestMarket?.total || 0}
          itemsCount={listItems.length}
        />
      )}
    </div>
  );
}