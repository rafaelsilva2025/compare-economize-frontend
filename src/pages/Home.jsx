import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShoppingBag, Sparkles, MapPin, TrendingUp, Shield, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketCard from '@/components/market/MarketCard';
import CategoryCard from '@/components/category/CategoryCard';
import { motion } from 'framer-motion';
import SkeletonCard from '@/components/loading/SkeletonCard';
import { useUserLocationRobust, calculateDistance } from '@/components/location/useUserLocationRobust';
import LocationFallbackModalRobust from '@/components/location/LocationFallbackModalRobust';
import { toast } from 'sonner';

export default function Home() {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  // ✅ MARKETS (agora do seu backend)
  const {
    data: markets = [],
    isLoading: isLoadingMarkets,
    isFetching: isFetchingMarkets,
    error: marketsError,
  } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const res = await apiRequest('/api/markets');
      return Array.isArray(res) ? res : [];
    },
  });

  // ✅ CATEGORIES (se existir no backend)
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/categories');
        return Array.isArray(res) ? res : [];
      } catch (e) {
        return [];
      }
    },
  });

  // ✅ FAVORITOS (temporário/local: localStorage) — mantém toda a lógica sem Base44
  const { data: favoriteMarkets = [] } = useQuery({
    queryKey: ['favoriteMarkets'],
    queryFn: async () => {
      try {
        const sessionId = localStorage.getItem('sessionId') || Date.now().toString();
        if (!localStorage.getItem('sessionId')) localStorage.setItem('sessionId', sessionId);

        const raw = localStorage.getItem(`favoriteMarkets:${sessionId}`);
        const ids = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ids)) return [];

        // mantém o mesmo formato que você usava: [{ market: "id" }]
        return ids.map((id) => ({ market: id }));
      } catch (error) {
        return [];
      }
    },
  });

  const {
    status: locationStatus,
    coords: userLocation,
    error: locationError,
    isFromCache,
    requestLocationRobust,
    saveManualCoords,
    getFailCount,
  } = useUserLocationRobust();

  const queryClient = useQueryClient();

  // Normalize markets with categoryId
  const normalizedMarkets = React.useMemo(() => {
    return markets.map(market => {
      const categoryId = market.category?.id ?? market.categoryId ?? market.category ?? null;
      return { ...market, _categoryIdNormalized: categoryId };
    });
  }, [markets]);

  // Filter by category
  const filteredMarkets = React.useMemo(() => {
    if (selectedCategoryId === 'all') return normalizedMarkets;
    return normalizedMarkets.filter(m => m._categoryIdNormalized === selectedCategoryId);
  }, [normalizedMarkets, selectedCategoryId]);

  // Calculate distances and sort
  const filteredAndSortedMarkets = React.useMemo(() => {
    const withDistance = filteredMarkets.map(market => {
      if (userLocation && market.latitude && market.longitude) {
        const dist = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          market.latitude,
          market.longitude
        );
        return { ...market, calculatedDistance: dist };
      }
      return market;
    });

    if (userLocation) {
      return withDistance.sort((a, b) => {
        const distA = a.calculatedDistance ?? 999;
        const distB = b.calculatedDistance ?? 999;
        return distA - distB;
      });
    }
    return withDistance;
  }, [filteredMarkets, userLocation]);

  // Handle location request
  const handleRequestLocation = async () => {
    const failCount = getFailCount('home');

    if (failCount >= 1) {
      setShowLocationModal(true);
      return;
    }

    try {
      await requestLocationRobust('home');
      toast.success('Localização obtida! Ordenando por proximidade...');
    } catch (err) {
      toast.error('Não consegui acessar o GPS. Toque novamente para informar seu endereço.');
    }
  };

  // Handle manual coords from modal
  const handleManualCoordsSet = (lat, lng) => {
    saveManualCoords(lat, lng);
    toast.success('Localização definida! Ordenando por proximidade...');
  };

  // Toggle favorite (localStorage)
  const handleToggleFavorite = async (marketId) => {
    const sessionId = localStorage.getItem('sessionId') || Date.now().toString();
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', sessionId);
    }

    const key = `favoriteMarkets:${sessionId}`;
    const raw = localStorage.getItem(key);
    const ids = raw ? JSON.parse(raw) : [];
    const safeIds = Array.isArray(ids) ? ids : [];

    const idStr = String(marketId);
    const exists = safeIds.map(String).includes(idStr);

    const next = exists
      ? safeIds.filter((x) => String(x) !== idStr)
      : [...safeIds, idStr];

    localStorage.setItem(key, JSON.stringify(next));
    queryClient.invalidateQueries({ queryKey: ['favoriteMarkets'] });
  };

  // Map category slug to ID for filtering
  const categorySlugToId = React.useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      if (cat.icon) map[cat.icon] = cat.id;
      if (cat.slug) map[cat.slug] = cat.id; // extra: se vier slug do backend
    });
    return map;
  }, [categories]);

  // Get current category name for title
  const currentCategoryName = React.useMemo(() => {
    if (selectedCategoryId === 'all') return 'Lugares';
    const category = categories.find(c => c.id === selectedCategoryId);
    return category?.name || 'Lugares';
  }, [selectedCategoryId, categories]);

  const sectionTitle = `${currentCategoryName} próximos`;

  // Separate favorites from other markets
  const favoriteMarketIds = favoriteMarkets.map(f => String(f.market));
  const favMarkets = filteredAndSortedMarkets.filter(m => favoriteMarketIds.includes(String(m.id)));
  const nonFavMarkets = filteredAndSortedMarkets.filter(m => !favoriteMarketIds.includes(String(m.id)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full mb-5">
              <span className="text-xs font-medium text-gray-600">Modo visitante • Sem cadastro</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Compare preços perto de você e economize
            </h1>

            <p className="text-base md:text-lg text-gray-600 mb-8 max-w-xl mx-auto">
              Compare mercados, farmácias, postos e conveniências próximos — e veja onde sai mais barato
            </p>

            <Link to={createPageUrl('MinhaLista')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 text-base rounded-2xl shadow-sm transition-all hover:shadow-md">
                Começar sem cadastro
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Onde você quer economizar hoje?
          </h2>
          <p className="text-gray-600">
            Escolha a categoria e compare preços nos lugares perto de você
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            {
              name: 'Mercados',
              slug: 'mercado',
              description: 'Compare sua lista de compras',
              bgColor: 'bg-emerald-50',
              iconColor: 'text-emerald-600'
            },
            {
              name: 'Farmácias',
              slug: 'farmacia',
              description: 'Encontre os melhores preços',
              bgColor: 'bg-blue-50',
              iconColor: 'text-blue-600'
            },
            {
              name: 'Combustível',
              slug: 'combustivel',
              description: 'Economize no abastecimento',
              bgColor: 'bg-amber-50',
              iconColor: 'text-amber-600'
            },
            {
              name: 'Conveniência',
              slug: 'conveniencia',
              description: 'Compras rápidas e baratas',
              bgColor: 'bg-purple-50',
              iconColor: 'text-purple-600'
            },
            {
              name: 'Hotéis',
              slug: 'hotel',
              description: 'Compare preços de hospedagem',
              bgColor: 'bg-pink-50',
              iconColor: 'text-pink-600'
            },
            {
              name: 'Outros',
              slug: 'outros',
              description: 'Em breve: pet shops, restaurantes e mais',
              bgColor: 'bg-gray-50',
              iconColor: 'text-gray-600',
              isComingSoon: true
            },
          ].map((category, i) => (
            <CategoryCard key={category.slug} category={category} index={i} />
          ))}
        </div>
      </section>

      {/* Quick Start Cards */}
      <section className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Smart Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to={createPageUrl('BuscaInteligente')}>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group text-white">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-lg">Busca Inteligente</h3>
                      <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">IA</span>
                    </div>
                    <p className="text-sm text-purple-100 mb-3">Digite o que precisa naturalmente e descubra onde comprar mais barato</p>
                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                      <span>Experimentar</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Traditional List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <Link to={createPageUrl('MinhaLista')}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1.5">Criar lista manual</h3>
                    <p className="text-sm text-gray-500 mb-3">Monte sua lista produto por produto e compare preços</p>
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <span>Começar agora</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: TrendingUp, title: 'Compare preços', desc: 'Veja onde suas compras ficam mais baratas' },
            { icon: MapPin, title: 'Perto de você', desc: 'Compare lugares da sua região por distância' },
            { icon: Shield, title: 'Preços atualizados', desc: 'Veja quando os preços foram atualizados' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-gray-100"
            >
              <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center mb-3.5">
                <feature.icon className="w-5 h-5 text-emerald-600" strokeWidth={2} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1.5 text-base">{feature.title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Nearby Places */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{sectionTitle}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-500">
                {userLocation ? 'Ordenado por proximidade' : 'Veja as opções perto de você'}
              </p>
              {locationStatus === 'requesting' && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                  Obtendo localização…
                </span>
              )}
              {userLocation && isFromCache && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  📍 Cache
                </span>
              )}
              {userLocation && !isFromCache && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  📍 GPS ativo
                </span>
              )}
            </div>
          </div>
          <Link to={createPageUrl('Mercados')} className="text-emerald-600 text-sm font-medium hover:text-emerald-700 flex items-center gap-1">
            Ver todos
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* CTA to enable location */}
        {!userLocation && locationStatus !== 'requesting' && !isLoadingMarkets && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleRequestLocation}
            className="w-full mb-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-4 flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Ativar localização</p>
                <p className="text-xs text-gray-600">Ordenar por proximidade e ver distâncias</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}

        {/* ✅ LOADING REAL (não depende de markets.length) */}
        {isLoadingMarkets || isFetchingMarkets ? (
          <div className="space-y-3">
            <SkeletonCard variant="market" />
            <SkeletonCard variant="market" />
            <SkeletonCard variant="market" />
          </div>
        ) : filteredAndSortedMarkets.length > 0 ? (
          <div className="space-y-3">
            {/* Favorites first */}
            {favMarkets.length > 0 && (
              <>
                {favMarkets.slice(0, 2).map((market, i) => (
                  <motion.div
                    key={market.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  >
                    <MarketCard
                      market={market}
                      userLocation={userLocation}
                      onRequestLocation={handleRequestLocation}
                      isFavorite={true}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </motion.div>
                ))}
              </>
            )}
            {/* Non-favorites */}
            {nonFavMarkets.slice(0, favMarkets.length > 0 ? 1 : 3).map((market, i) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + (favMarkets.length + i) * 0.1 }}
              >
                <MarketCard
                  market={market}
                  userLocation={userLocation}
                  onRequestLocation={handleRequestLocation}
                  isFavorite={false}
                  onToggleFavorite={handleToggleFavorite}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-12 text-center border border-gray-100"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ainda não há estabelecimentos dessa categoria por perto
            </h3>
            <p className="text-sm text-gray-500">
              Novos locais serão adicionados em breve
            </p>
          </motion.div>
        )}

        {/* Location Fallback Modal */}
        <LocationFallbackModalRobust
          open={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onRetryGPS={() => requestLocationRobust('home')}
          destinationLat={null}
          destinationLng={null}
          destinationName="sua localização"
          onManualCoordsSet={handleManualCoordsSet}
        />
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-10 relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Economize mais em todas as suas compras
            </h2>
            <p className="text-emerald-50 mb-6 text-base">
              Crie uma conta grátis para salvar comparações, receber alertas e acompanhar sua economia.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              {[
                { icon: '📊', text: 'Alertas de preço' },
                { icon: '📋', text: 'Listas salvas' },
                { icon: '📈', text: 'Histórico' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-emerald-50 text-sm">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <Link to={createPageUrl('CriarConta')}>
              <Button className="bg-white text-emerald-700 hover:bg-gray-50 h-12 px-8 text-base rounded-2xl shadow-sm">
                Criar conta grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
