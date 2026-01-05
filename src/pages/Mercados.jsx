import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, RefreshCw, Map, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import MarketCard from '@/components/market/MarketCard';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserLocation, getDistanceFromUser } from '@/components/location/useUserLocation';

// Mock markets
const mockMarkets = [
  { id: '1', name: 'Supermercado Extra', city: 'São Paulo', distance: 0.8, lastUpdate: new Date().toISOString(), isOpen: true },
  { id: '2', name: 'Carrefour Express', city: 'São Paulo', distance: 1.2, lastUpdate: new Date().toISOString(), isOpen: true },
  { id: '3', name: 'Pão de Açúcar', city: 'São Paulo', distance: 2.1, lastUpdate: new Date(Date.now() - 86400000).toISOString(), isOpen: false },
];

export default function Mercados() {
  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list(),
  });

  const { status: locationStatus, coords: userLocation } = useUserLocation();

  // Calculate distances and sort by distance
  const marketsWithDistance = React.useMemo(() => {
    const marketsList = markets.length > 0 ? markets : mockMarkets;
    
    return marketsList.map(market => {
      const calculatedDistance = getDistanceFromUser(
        userLocation,
        market.latitude,
        market.longitude
      );
      
      return {
        ...market,
        calculatedDistance: calculatedDistance !== null ? calculatedDistance : market.distance,
      };
    });
  }, [markets, userLocation]);

  // Sort by distance if user location is available
  const displayMarkets = React.useMemo(() => {
    if (locationStatus === 'granted' && userLocation) {
      return [...marketsWithDistance].sort((a, b) => {
        const distA = a.calculatedDistance ?? 999;
        const distB = b.calculatedDistance ?? 999;
        return distA - distB;
      });
    }
    return marketsWithDistance;
  }, [marketsWithDistance, locationStatus, userLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Mercados</h1>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" viewBox="0 0 400 200">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative flex items-center gap-2 text-gray-500">
          <Map className="w-6 h-6" />
          <span className="font-medium">Mapa ilustrativo</span>
        </div>
        
        {/* Mock markers */}
        <div className="absolute top-12 left-1/4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="absolute top-20 right-1/3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="absolute bottom-16 left-1/2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <MapPin className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              {displayMarkets.length} mercados encontrados
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {locationStatus === 'granted' && (
                <span className="text-xs text-emerald-600">📍 Ordenado por proximidade</span>
              )}
              {locationStatus === 'denied' && (
                <span className="text-xs text-amber-600">Permita localização para ver distâncias</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {displayMarkets.map((market, i) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <MarketCard 
                market={market} 
                userLocation={userLocation}
                showCalculatedDistance={true}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}