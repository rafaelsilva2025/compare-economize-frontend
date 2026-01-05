import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, Star, TrendingDown, Award, Navigation, Hotel, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUserLocationRobust, calculateDistance } from '@/components/location/useUserLocationRobust';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SkeletonCard from '@/components/loading/SkeletonCard';
import { checkPremium } from '@/components/premium/premiumUtils';

export default function HoteisComparacao() {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState('Standard');
  const [minRating, setMinRating] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  
  const { coords: userLocation } = useUserLocationRobust();

  useEffect(() => {
    checkPremium().then(setIsPremium);
  }, []);

  // Fetch hotels (markets with hotel category)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const hotelCategory = categories.find(c => c.icon === 'hotel');

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ['hotels', hotelCategory?.id],
    queryFn: async () => {
      if (!hotelCategory?.id) return [];
      return await base44.entities.Market.filter({ category: hotelCategory.id });
    },
    enabled: !!hotelCategory?.id,
  });

  // Fetch hotel prices
  const { data: hotelPrices = [] } = useQuery({
    queryKey: ['hotelPrices'],
    queryFn: () => base44.entities.HotelPrice.list(),
  });

  // Calculate number of nights
  const numberOfNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  // Get all unique amenities
  const allAmenities = React.useMemo(() => {
    const amenitiesSet = new Set();
    hotels.forEach(hotel => {
      if (hotel.amenities) {
        hotel.amenities.forEach(a => amenitiesSet.add(a));
      }
    });
    return Array.from(amenitiesSet);
  }, [hotels]);

  // Calculate hotel comparisons
  const hotelComparisons = React.useMemo(() => {
    if (!checkIn || !checkOut || numberOfNights <= 0) return [];

    return hotels.map(hotel => {
      // Find prices for this hotel in the date range
      const relevantPrices = hotelPrices.filter(p => 
        p.hotel === hotel.id && 
        p.roomType === selectedRoomType &&
        p.available
      );

      // For demo, use first available price or calculate average
      const avgPricePerNight = relevantPrices.length > 0
        ? relevantPrices.reduce((sum, p) => sum + p.pricePerNight, 0) / relevantPrices.length
        : null;

      const totalPrice = avgPricePerNight ? avgPricePerNight * numberOfNights : null;

      // Calculate distance
      let distance = null;
      if (userLocation && hotel.latitude && hotel.longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          hotel.latitude,
          hotel.longitude
        );
      }

      return {
        hotel,
        pricePerNight: avgPricePerNight,
        totalPrice,
        distance,
        rating: hotel.rating || 0,
        available: !!avgPricePerNight,
      };
    }).filter(h => {
      if (!h.available) return false;
      
      // Apply premium filters
      if (isPremium) {
        if (minRating > 0 && h.rating < minRating) return false;
        if (selectedAmenities.length > 0) {
          const hotelAmenities = h.hotel.amenities || [];
          const hasAllAmenities = selectedAmenities.every(a => hotelAmenities.includes(a));
          if (!hasAllAmenities) return false;
        }
      }
      
      return true;
    });
  }, [hotels, hotelPrices, checkIn, checkOut, numberOfNights, selectedRoomType, userLocation, isPremium, minRating, selectedAmenities]);

  // Sort and identify badges
  const sortedHotels = [...hotelComparisons].sort((a, b) => {
    if (!a.totalPrice) return 1;
    if (!b.totalPrice) return -1;
    return a.totalPrice - b.totalPrice;
  });

  const cheapest = sortedHotels[0];
  const bestRated = [...hotelComparisons].sort((a, b) => b.rating - a.rating)[0];
  const closest = [...hotelComparisons]
    .filter(h => h.distance !== null)
    .sort((a, b) => a.distance - b.distance)[0];

  const amenityIcons = {
    wifi: '📶',
    café: '☕',
    'café da manhã': '☕',
    estacionamento: '🅿️',
    piscina: '🏊',
    'ar-condicionado': '❄️',
    academia: '💪',
    restaurante: '🍽️',
    'serviço de quarto': '🛎️',
    spa: '💆',
  };

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
            <div>
              <h1 className="font-semibold text-gray-900">Comparar Hotéis</h1>
              <span className="text-xs text-gray-500">Encontre a melhor hospedagem</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Date Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Hotel className="w-5 h-5 text-pink-600" />
            <h2 className="font-semibold text-gray-900">Selecione as datas</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Check-in</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Calendar className="w-4 h-4 mr-2" />
                    {checkIn ? format(checkIn, 'dd/MM', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Check-out</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Calendar className="w-4 h-4 mr-2" />
                    {checkOut ? format(checkOut, 'dd/MM', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < new Date() || (checkIn && date <= checkIn)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Room Type */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Tipo de quarto</label>
            <div className="flex gap-2">
              {['Standard', 'Luxo', 'Suíte'].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedRoomType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedRoomType === type
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {numberOfNights > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{numberOfNights}</span> {numberOfNights === 1 ? 'noite' : 'noites'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Premium Filters */}
        {checkIn && checkOut && numberOfNights > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-white rounded-2xl p-5 shadow-sm border mb-6 ${
              isPremium ? 'border-gray-100' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Filtros avançados</h3>
                {!isPremium && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium rounded-full">
                    Premium
                  </span>
                )}
              </div>
              {!isPremium && (
                <Link to={createPageUrl('Planos')}>
                  <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    Desbloquear
                  </Button>
                </Link>
              )}
            </div>

            {isPremium ? (
              <>
                {/* Rating Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Avaliação mínima</label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                          minRating === rating
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {rating === 0 ? 'Todas' : `${rating}+ ⭐`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Comodidades</label>
                  <div className="flex flex-wrap gap-2">
                    {allAmenities.map(amenity => (
                      <button
                        key={amenity}
                        onClick={() => {
                          if (selectedAmenities.includes(amenity)) {
                            setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
                          } else {
                            setSelectedAmenities([...selectedAmenities, amenity]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedAmenities.includes(amenity)
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Lock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Filtros premium bloqueados</p>
                <p className="text-xs text-gray-500">
                  Filtre por avaliação, comodidades e receba alertas de preço
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Hotels List */}
        {!checkIn || !checkOut ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione as datas</h3>
            <p className="text-sm text-gray-500">Escolha check-in e check-out para comparar preços</p>
          </div>
        ) : numberOfNights <= 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Check-out deve ser após o check-in</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <SkeletonCard variant="market" />
            <SkeletonCard variant="market" />
          </div>
        ) : sortedHotels.length === 0 ? (
          <div className="text-center py-12">
            <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum hotel disponível</h3>
            <p className="text-sm text-gray-500">Tente outras datas ou tipo de quarto</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-5 text-white mb-6 shadow-lg"
            >
              <p className="text-pink-100 text-sm mb-2">{sortedHotels.length} {sortedHotels.length === 1 ? 'hotel disponível' : 'hotéis disponíveis'}</p>
              {cheapest && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-pink-100 text-xs mb-1">Melhor preço</p>
                    <p className="text-2xl font-bold">R$ {cheapest.totalPrice.toFixed(2)}</p>
                    <p className="text-pink-100 text-xs">{cheapest.hotel.name}</p>
                  </div>
                  <div>
                    <p className="text-pink-100 text-xs mb-1">Por noite</p>
                    <p className="text-xl font-bold">R$ {cheapest.pricePerNight.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Hotels Cards */}
            <div className="space-y-3">
              {sortedHotels.map((comparison, i) => {
                const isCheapest = cheapest && comparison.hotel.id === cheapest.hotel.id;
                const isBestRated = bestRated && comparison.hotel.id === bestRated.hotel.id;
                const isClosest = closest && comparison.hotel.id === closest.hotel.id;

                const badges = [];
                if (isCheapest) badges.push({ label: 'Melhor preço', color: 'emerald', icon: TrendingDown });
                if (isBestRated && comparison.rating > 0) badges.push({ label: 'Mais bem avaliado', color: 'amber', icon: Star });
                if (isClosest && comparison.distance) badges.push({ label: 'Mais perto', color: 'blue', icon: MapPin });

                return (
                  <motion.div
                    key={comparison.hotel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                      isCheapest ? 'border-pink-200 ring-2 ring-pink-100' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{comparison.hotel.name}</h3>
                        
                        {/* Badges */}
                        {badges.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {badges.map((badge, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${
                                  badge.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                                  badge.color === 'amber' ? 'bg-amber-50 text-amber-700' :
                                  'bg-blue-50 text-blue-700'
                                }`}
                              >
                                <badge.icon className="w-3 h-3" />
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          {comparison.rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {comparison.rating.toFixed(1)}
                            </span>
                          )}
                          {comparison.distance && (
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" />
                              {comparison.distance.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        {/* Amenities */}
                        {comparison.hotel.amenities && comparison.hotel.amenities.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {comparison.hotel.amenities.slice(0, 5).map((amenity, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {amenityIcons[amenity.toLowerCase()] || '•'} {amenity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-3">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className={`text-xl font-bold ${isCheapest ? 'text-pink-600' : 'text-gray-900'}`}>
                          R$ {comparison.totalPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">R$ {comparison.pricePerNight.toFixed(2)}/noite</p>
                      </div>
                    </div>

                    {/* Check-in/out times */}
                    {(comparison.hotel.checkInTime || comparison.hotel.checkOutTime) && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                        {comparison.hotel.checkInTime && (
                          <span>Check-in: {comparison.hotel.checkInTime}</span>
                        )}
                        {comparison.hotel.checkOutTime && (
                          <span>Check-out: {comparison.hotel.checkOutTime}</span>
                        )}
                      </div>
                    )}

                    <Link to={createPageUrl(`MarketDetail?id=${comparison.hotel.id}`)}>
                      <Button className="w-full mt-4 bg-pink-600 hover:bg-pink-700">
                        Ver detalhes e reservar
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}