import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, ChevronRight, CheckCircle, Clock, ShoppingCart, Pill, Fuel, Store, Navigation, Heart } from 'lucide-react';
import { calculateDistance } from '@/components/location/useUserLocationRobust';
import { apiRequest } from "@/api/apiClient";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const categoryIcons = {
  'mercado': ShoppingCart,
  'farmacia': Pill,
  'combustivel': Fuel,
  'conveniencia': Store,
};

export default function MarketCard({ market, total, isCheapest, userLocation, showCalculatedDistance, onRequestLocation, isFavorite, onToggleFavorite }) {
  const queryClient = useQueryClient();
  // Determine update status
  const getUpdateStatus = () => {
    if (!market.lastUpdate) return { text: 'Atualizado hoje', color: 'emerald' };
    
    const lastUpdate = new Date(market.lastUpdate);
    const now = new Date();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (diffHours < 24) return { text: 'Atualizado hoje', color: 'emerald' };
    if (diffHours < 48) return { text: 'Atualizado ontem', color: 'gray' };
    return { text: 'Atualizado ontem', color: 'gray' };
  };

  const updateStatus = getUpdateStatus();

  const CategoryIcon = market.categorySlug ? categoryIcons[market.categorySlug] : null;

  // Calculate distance if user location is available
  const displayDistance = React.useMemo(() => {
    if (userLocation && market.latitude && market.longitude) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        market.latitude,
        market.longitude
      );
      return dist.toFixed(1);
    }
    return null;
  }, [market, userLocation]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (onToggleFavorite) {
        return await onToggleFavorite(market.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteMarkets'] });
      toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    },
  });

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  return (
    <div className="relative">
      <Link 
      to={createPageUrl(`MarketDetail?id=${market.id}`)}
      className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-emerald-100 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {CategoryIcon && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${market.categoryBg}`}>
                <CategoryIcon className={`w-4 h-4 ${market.categoryColor}`} />
              </div>
            )}
            <h3 className="font-semibold text-gray-900 text-base">{market.name}</h3>
            {isCheapest && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full flex-shrink-0">
                Mais barato
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
            {userLocation === undefined ? (
              <span className="flex items-center gap-1 text-gray-400">
                <div className="w-3.5 h-3.5 bg-gray-200 rounded animate-pulse"></div>
                <span className="w-16 h-3 bg-gray-200 rounded animate-pulse"></span>
              </span>
            ) : displayDistance !== null ? (
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                {displayDistance} km de você
              </span>
            ) : market.latitude && market.longitude ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onRequestLocation) onRequestLocation();
                }}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ativar localização
              </button>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                Indisponível
              </span>
            )}
            {market.isOpen !== undefined && (
              <span className={`flex items-center gap-1 text-xs font-medium ${market.isOpen ? 'text-emerald-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3" />
                {market.isOpen ? 'Aberto agora' : 'Fechado'}
              </span>
            )}
          </div>
          
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md ${
            updateStatus.color === 'emerald' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {updateStatus.text}
          </span>
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          {total && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-bold text-lg text-gray-900">R$ {total.toFixed(2)}</p>
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </Link>
      
      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-all z-10"
        >
          <Heart 
            className={`w-5 h-5 transition-all ${
              isFavorite 
                ? 'fill-red-500 text-red-500' 
                : 'text-gray-400 hover:text-red-400'
            }`}
          />
        </button>
      )}
    </div>
  );
}