import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Bell, Lock, TrendingDown, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PriceAlertModal from '@/components/alerts/PriceAlertModal';
import ActiveAlerts from '@/components/alerts/ActiveAlerts';
import { checkPremium } from '@/components/premium/premiumUtils';

// Mock data
const mockProducts = {
  'p1': { id: 'p1', name: 'Arroz 5kg', unit: 'un' },
  'p2': { id: 'p2', name: 'Feijão 1kg', unit: 'un' },
  'p3': { id: 'p3', name: 'Açúcar 1kg', unit: 'un' },
  'p4': { id: 'p4', name: 'Óleo de Soja 900ml', unit: 'un' },
  'p5': { id: 'p5', name: 'Leite Integral 1L', unit: 'un' },
  'p6': { id: 'p6', name: 'Café 500g', unit: 'un' },
  'p7': { id: 'p7', name: 'Macarrão 500g', unit: 'un' },
  'p8': { id: 'p8', name: 'Molho de Tomate 340g', unit: 'un' },
  'p9': { id: 'p9', name: 'Sabão em Pó 1kg', unit: 'un' },
  'p10': { id: 'p10', name: 'Papel Higiênico 12 rolos', unit: 'un' },
};

const marketPrices = {
  '1': { name: 'Supermercado Extra', distance: 0.8, prices: { 'p1': 23.90, 'p2': 7.99, 'p3': 4.79, 'p4': 7.49, 'p5': 4.99, 'p6': 14.90, 'p7': 3.99, 'p8': 3.49, 'p9': 11.90, 'p10': 17.90 }},
  '2': { name: 'Carrefour Express', distance: 1.2, prices: { 'p1': 24.90, 'p2': 8.49, 'p3': 4.99, 'p4': 7.89, 'p5': 5.29, 'p6': 15.90, 'p7': 4.49, 'p8': 3.99, 'p9': 12.90, 'p10': 18.90 }},
  '3': { name: 'Pão de Açúcar', distance: 2.1, prices: { 'p1': 25.90, 'p2': 8.99, 'p3': 5.29, 'p4': 8.29, 'p5': 5.49, 'p6': 16.90, 'p7': 4.79, 'p8': 4.29, 'p9': 13.90, 'p10': 19.90 }},
};

// Generate mock price history
const generatePriceHistory = (basePrice) => {
  const history = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 2;
    history.push({
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      price: Math.max(basePrice * 0.85, basePrice + variation),
    });
  }
  return history;
};

export default function ProductDetail() {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  useEffect(() => {
    checkPremium().then(setIsPremium);
  }, []);
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'p1';
  const product = mockProducts[productId];

  // Get all prices for this product from all markets
  const productPrices = Object.entries(marketPrices).map(([marketId, market]) => ({
    marketId,
    marketName: market.name,
    distance: market.distance,
    price: market.prices[productId] || 0,
  })).sort((a, b) => a.price - b.price);

  const lowestPrice = productPrices[0]?.price || 0;
  const priceHistory = generatePriceHistory(lowestPrice);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-semibold text-gray-900">Detalhes do produto</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <p className="text-gray-500">{product.unit}</p>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-500">Menor preço recente</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">R$ {lowestPrice.toFixed(2)}</p>
          </div>
        </motion.div>

        {/* Price History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Histórico de preços</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `R$${value.toFixed(0)}`}
                />
                <Tooltip 
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Preço']}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          {isPremium ? (
            <ActiveAlerts productId={productId} />
          ) : (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Alertas de Preço Premium</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Seja notificado quando o preço deste produto baixar
                  </p>
                  <Link to={createPageUrl('Planos')}>
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-sm">
                      Ativar Premium
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Where is cheaper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">Onde está mais barato</h3>
          <div className="space-y-2">
            {productPrices.map((item, i) => (
              <Link key={item.marketId} to={createPageUrl(`MarketDetail?id=${item.marketId}`)}>
                <div className={`bg-white rounded-xl p-4 border transition-all hover:shadow-md ${
                  i === 0 ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{item.marketName}</h4>
                        {i === 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Mais barato
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {item.distance} km
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${i === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                      R$ {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          {isPremium ? (
            <Button 
              onClick={() => setShowAlertModal(true)}
              className="w-full py-6 text-base rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              <Bell className="w-5 h-5 mr-2" />
              Criar alerta de preço
            </Button>
          ) : (
            <Link to={createPageUrl('Planos')}>
              <Button 
                className="w-full py-6 text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Desbloquear alertas com Premium
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Price Alert Modal */}
      <PriceAlertModal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        product={product}
        currentPrice={lowestPrice}
      />
    </div>
  );
}