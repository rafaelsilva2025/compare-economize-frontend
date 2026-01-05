import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Navigation, Bell, Lock, Check, AlertCircle, ShoppingCart, Pill, Fuel, Store, Phone, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUserLocationRobust, calculateDistance } from '@/components/location/useUserLocationRobust';
import LocationFallbackModalRobust from '@/components/location/LocationFallbackModalRobust';
import MiniMap from '@/components/location/MiniMap';
import SkeletonCard from '@/components/loading/SkeletonCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSponsoredProducts } from '@/components/product/useSponsoredProducts';
import SponsoredBadge from '@/components/product/SponsoredBadge';

const categoryIcons = {
  'mercado': ShoppingCart,
  'farmacia': Pill,
  'combustivel': Fuel,
  'conveniencia': Store,
};

// Mock data (fallback)
const mockMarkets = {
  '1': { id: '1', name: 'Supermercado Extra', distance: 0.8, isOpen: true, hours: '07:00 - 22:00', category: 'Mercado' },
  '2': { id: '2', name: 'Carrefour Express', distance: 1.2, isOpen: true, hours: '06:00 - 23:00', category: 'Mercado' },
  '3': { id: '3', name: 'Pão de Açúcar', distance: 2.1, isOpen: true, hours: '07:00 - 22:00', category: 'Mercado' },
};

const mockProducts = {
  'p1': { name: 'Arroz 5kg', unit: 'un' },
  'p2': { name: 'Feijão 1kg', unit: 'un' },
  'p3': { name: 'Açúcar 1kg', unit: 'un' },
  'p4': { name: 'Óleo de Soja 900ml', unit: 'un' },
  'p5': { name: 'Leite Integral 1L', unit: 'un' },
  'p6': { name: 'Café 500g', unit: 'un' },
  'p7': { name: 'Macarrão 500g', unit: 'un' },
  'p8': { name: 'Molho de Tomate 340g', unit: 'un' },
  'p9': { name: 'Sabão em Pó 1kg', unit: 'un' },
  'p10': { name: 'Papel Higiênico 12 rolos', unit: 'un' },
};

const marketPrices = {
  '1': { 'p1': 23.90, 'p2': 7.99, 'p3': 4.79, 'p4': 7.49, 'p5': 4.99, 'p6': 14.90, 'p7': 3.99, 'p8': 3.49, 'p9': 11.90, 'p10': 17.90 },
  '2': { 'p1': 24.90, 'p2': 8.49, 'p3': 4.99, 'p4': 7.89, 'p5': 5.29, 'p6': 15.90, 'p7': 4.49, 'p8': 3.99, 'p9': 12.90, 'p10': 18.90 },
  '3': { 'p1': 25.90, 'p2': 8.99, 'p3': 5.29, 'p4': 8.29, 'p5': 5.49, 'p6': 16.90, 'p7': 4.79, 'p8': 4.29, 'p9': 13.90, 'p10': 19.90 },
};

export default function MarketDetail() {
  const [listItems, setListItems] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const marketId = urlParams.get('id') || '1';
  const queryClient = useQueryClient();
  
  const { 
    status: locationStatus, 
    coords: userLocation, 
    error: locationError,
    isFromCache,
    requestLocationRobust,
    saveManualCoords,
    getFailCount,
  } = useUserLocationRobust();
  
  const { isProductSponsored } = useSponsoredProducts();
  


  // Fetch market data
  const { data: marketData, isLoading: isLoadingMarket } = useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      try {
        const markets = await base44.entities.Market.list();
        return markets.find(m => m.id === marketId);
      } catch (error) {
        return null;
      }
    },
  });

  // Fetch category data if market has a category
  const { data: categoryData } = useQuery({
    queryKey: ['category', marketData?.category],
    queryFn: async () => {
      try {
        const categories = await base44.entities.Category.list();
        return categories.find(c => c.id === marketData.category);
      } catch (error) {
        return null;
      }
    },
    enabled: !!marketData?.category,
  });

  // Fetch prices for this market
  const { data: pricesData = [], isLoading: isLoadingPrices } = useQuery({
    queryKey: ['prices', marketId],
    queryFn: async () => {
      try {
        return await base44.entities.Price.filter({ market: marketId });
      } catch (error) {
        return [];
      }
    },
    enabled: !!marketId,
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
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

  const isFavorite = favoriteMarkets.some(f => f.market === marketId);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('sessionId') || Date.now().toString();
      if (!localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', sessionId);
      }

      let user = null;
      try {
        user = await base44.auth.me();
      } catch (error) {
        // Not authenticated
      }

      const existing = favoriteMarkets.find(f => f.market === marketId);
      
      if (existing) {
        await base44.entities.FavoriteMarket.delete(existing.id);
      } else {
        await base44.entities.FavoriteMarket.create({
          market: marketId,
          user: user?.id,
          sessionId: user ? undefined : sessionId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteMarkets'] });
      toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    },
  });

  const market = marketData || mockMarkets[marketId];
  const prices = marketPrices[marketId] || {};

  // Calculate distance from user
  const distanceFromUser = React.useMemo(() => {
    if (userLocation && market?.latitude && market?.longitude) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        market.latitude,
        market.longitude
      );
      return dist.toFixed(1);
    }
    return null;
  }, [userLocation, market]);

  // Handle location request
  const handleRequestLocation = async () => {
    const failCount = getFailCount(marketId);
    
    // If failed before, open modal directly
    if (failCount >= 1) {
      setShowLocationModal(true);
      return;
    }
    
    // First attempt: try GPS
    try {
      await requestLocationRobust(marketId);
      toast.success('Localização obtida!');
    } catch (err) {
      toast.error('Não consegui acessar o GPS. Toque novamente para informar seu endereço.');
    }
  };

  // Handle manual coords from modal
  const handleManualCoordsSet = (lat, lng) => {
    saveManualCoords(lat, lng);
  };

  // Convert prices data to lookup object
  const pricesLookup = {};
  pricesData.forEach(p => {
    pricesLookup[p.product] = p.price;
  });

  useEffect(() => {
    const saved = localStorage.getItem('shoppingList');
    if (saved) {
      setListItems(JSON.parse(saved));
    }
  }, []);

  const total = listItems.reduce((sum, item) => {
    const price = pricesLookup[item.productId] || prices[item.productId] || 0;
    return sum + (price * item.quantity);
  }, 0);

  // Get category info
  const categoryName = categoryData?.name || market?.category || 'Categoria não definida';
  const categorySlug = categoryData?.icon || market?.category?.toLowerCase() || 'mercado';
  const CategoryIcon = categoryIcons[categorySlug] || ShoppingCart;

  // Check if currently open based on opening hours
  const checkIfOpen = () => {
    if (!market?.openingHours) return market?.isOpen || false;
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = market.openingHours[currentDay];
    if (!todayHours || todayHours === 'Fechado') return false;
    
    // Parse hours like "13:00–00:00" or "07:00–03:00"
    const match = todayHours.match(/(\d{2}):(\d{2})[–-](\d{2}):(\d{2})/);
    if (!match) return false;
    
    const openTime = parseInt(match[1]) * 60 + parseInt(match[2]);
    let closeTime = parseInt(match[3]) * 60 + parseInt(match[4]);
    
    // Handle closing after midnight
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime < closeTime;
    }
    
    return currentTime >= openTime && currentTime < closeTime;
  };

  const isCurrentlyOpen = checkIfOpen();

  // Format opening hours for display
  const dayLabels = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  // Handle navigation
  const handleOpenRoute = () => {
    toast.loading('Abrindo rota…');

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const origin = `${position.coords.latitude},${position.coords.longitude}`;
          let destination;

          // Use coordinates if available, otherwise use address
          if (market.latitude && market.longitude) {
            destination = `${market.latitude},${market.longitude}`;
          } else if (market.addressLine) {
            destination = encodeURIComponent(`${market.addressLine}, ${market.city}, ${market.state}`);
          } else {
            destination = encodeURIComponent(market.name);
          }

          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
          window.open(mapsUrl, '_blank');
          toast.dismiss();
        },
        (error) => {
          // User denied or error getting location - open destination only
          toast.dismiss();
          let query;
          
          if (market.latitude && market.longitude) {
            query = `${market.latitude},${market.longitude}`;
          } else if (market.addressLine) {
            query = encodeURIComponent(`${market.addressLine}, ${market.city}, ${market.state}`);
          } else {
            query = encodeURIComponent(market.name);
          }

          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
          window.open(mapsUrl, '_blank');
          
          if (error.code === error.PERMISSION_DENIED) {
            toast.info('Abrindo localização do estabelecimento');
          } else {
            toast.error('Não foi possível obter sua localização');
          }
        }
      );
    } else {
      // Geolocation not supported - open destination only
      toast.dismiss();
      let query;
      
      if (market.latitude && market.longitude) {
        query = `${market.latitude},${market.longitude}`;
      } else if (market.addressLine) {
        query = encodeURIComponent(`${market.addressLine}, ${market.city}, ${market.state}`);
      } else {
        query = encodeURIComponent(market.name);
      }

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(mapsUrl, '_blank');
      toast.info('Abrindo localização do estabelecimento');
    }
  };

  if (!market) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Mercado não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Comparacao')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">{market.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Market Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
              <CategoryIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{market.name}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isCurrentlyOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isCurrentlyOpen ? 'Aberto agora' : 'Fechado'}
                </span>
              </div>
              <span className="text-sm text-gray-500 block mb-1">{categoryName}</span>
              {locationStatus === 'requesting' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 animate-pulse" />
                    Obtendo sua localização…
                  </span>
                </div>
              ) : distanceFromUser !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {isFromCache ? '~' : ''}{distanceFromUser} km de você
                  </span>
                  {isFromCache && (
                    <span className="text-xs text-gray-400">(cache)</span>
                  )}
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Alterar
                  </button>
                </div>
              ) : market?.latitude && market?.longitude ? (
                <button
                  onClick={handleRequestLocation}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ativar a localização para ver a distância
                </button>
              ) : (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleRequestLocation}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Ativar a localização para ver a distância
                  </button>
                  <span className="text-xs text-amber-600">⚠️ Destino sem coordenadas — ajuste o local</span>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {market.addressLine && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-900">{market.addressLine}</p>
                  <p className="text-gray-500">
                    {market.city}{market.state ? `, ${market.state}` : ''}{market.zipCode ? ` - ${market.zipCode}` : ''}
                  </p>
                </div>
              </div>
              {market.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{market.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Opening Hours */}
          {market.openingHours && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Horários</h3>
              </div>
              <div className="space-y-1.5">
                {Object.entries(market.openingHours).map(([day, hours]) => {
                  const now = new Date();
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const isToday = dayNames[now.getDay()] === day;
                  
                  return (
                    <div key={day} className={`flex justify-between text-sm ${isToday ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      <span>{dayLabels[day]}{isToday && ' (hoje)'}</span>
                      <span className={hours === 'Fechado' ? 'text-gray-400' : ''}>{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total da compra</span>
            <span className="text-2xl font-bold text-emerald-600">R$ {total.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Mini Map */}
        {market.latitude && market.longitude && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Localização</h3>
            <MiniMap 
              latitude={market.latitude} 
              longitude={market.longitude} 
              name={market.name}
            />
          </motion.div>
        )}

        {/* Products List */}
        <h3 className="font-semibold text-gray-900 mb-4">Produtos disponíveis</h3>
        <div className="space-y-3">
          {isLoadingPrices ? (
            <>
              <SkeletonCard variant="product" />
              <SkeletonCard variant="product" />
              <SkeletonCard variant="product" />
            </>
          ) : pricesData.map((priceItem, i) => {
            const product = allProducts.find(p => p.id === priceItem.product);
            if (!product) return null;
            
            const isSponsored = isProductSponsored(product.id);

            const handleAddProduct = (e) => {
              e.preventDefault();
              const newItem = {
                id: Date.now().toString(),
                productId: product.id,
                quantity: 1,
                estimatedPrice: priceItem.price,
              };
              const updatedList = [...listItems, newItem];
              setListItems(updatedList);
              localStorage.setItem('shoppingList', JSON.stringify(updatedList));
            };

            return (
              <motion.div
                key={priceItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      {isSponsored && <SponsoredBadge small />}
                    </div>
                    <span className="text-sm text-gray-500">{product.unit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-lg">
                      R$ {priceItem.price.toFixed(2)}
                    </span>
                    <Button
                      onClick={handleAddProduct}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>

          {!isLoadingPrices && pricesData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum produto disponível</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-6 text-base rounded-xl"
            onClick={handleOpenRoute}
          >
            <Navigation className="w-5 h-5 mr-2" />
            Abrir rota
          </Button>
          
          <Button
            variant="outline"
            className="py-6 px-6 rounded-xl border-gray-200"
            onClick={() => toggleFavoriteMutation.mutate()}
          >
            <Heart 
              className={`w-5 h-5 transition-all ${
                isFavorite 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-600'
              }`}
            />
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="py-6 px-6 rounded-xl border-gray-200 text-gray-400"
                  disabled
                >
                  <Lock className="w-4 h-4 mr-2" />
                  <Bell className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crie uma conta para receber alertas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Location Fallback Modal */}
      <LocationFallbackModalRobust
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRetryGPS={() => requestLocationRobust(marketId)}
        destinationLat={market?.latitude}
        destinationLng={market?.longitude}
        destinationName={market?.name}
        onManualCoordsSet={handleManualCoordsSet}
      />
    </div>
  );
}