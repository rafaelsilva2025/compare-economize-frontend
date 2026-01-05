import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Calendar, Award, ShoppingBag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PremiumBanner from '@/components/premium/PremiumBanner';
import { checkPremium } from '@/components/premium/premiumUtils';

export default function MinhaEconomia() {
  const [timeRange, setTimeRange] = useState('month'); // 'month', 'all'
  const [isPremium, setIsPremium] = useState(false);
  
  useEffect(() => {
    checkPremium().then(setIsPremium);
  }, []);

  // Fetch user authentication
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });

  // Fetch savings snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['savingsSnapshots'],
    queryFn: async () => {
      try {
        const sessionId = localStorage.getItem('sessionId') || Date.now().toString();
        
        if (user) {
          return await base44.entities.SavingsSnapshot.filter({ user: user.id });
        } else {
          return await base44.entities.SavingsSnapshot.filter({ sessionId });
        }
      } catch (error) {
        return [];
      }
    },
    enabled: true,
  });

  // Calculate metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthSnapshots = snapshots.filter(s => {
    const date = new Date(s.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const lastMonthSnapshots = snapshots.filter(s => {
    const date = new Date(s.date);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  });

  const totalSavings = snapshots.reduce((sum, s) => sum + (s.savings || 0), 0);
  const thisMonthSavings = thisMonthSnapshots.reduce((sum, s) => sum + (s.savings || 0), 0);
  const lastMonthSavings = lastMonthSnapshots.reduce((sum, s) => sum + (s.savings || 0), 0);
  const savingsChange = lastMonthSavings > 0 
    ? ((thisMonthSavings - lastMonthSavings) / lastMonthSavings) * 100 
    : 0;

  // Chart data (last 6 months)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date(currentYear, currentMonth - i, 1);
    const monthSnapshots = snapshots.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
    });
    const monthSavings = monthSnapshots.reduce((sum, s) => sum + (s.savings || 0), 0);
    
    chartData.push({
      month: month.toLocaleDateString('pt-BR', { month: 'short' }),
      savings: monthSavings,
    });
  }

  const canViewFullHistory = isPremium;

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
            <h1 className="font-semibold text-gray-900">Minha Economia</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Crie uma conta para salvar sua economia
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Seus dados estão salvos localmente. Ao criar conta, você poderá acessá-los de qualquer dispositivo.
                </p>
                <Link to={createPageUrl('CriarConta')}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Criar conta grátis
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg"
          >
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-emerald-100 text-xs mb-1">Total economizado</p>
            <p className="text-3xl font-bold">R$ {totalSavings.toFixed(2)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-gray-100"
          >
            <Calendar className="w-8 h-8 mb-2 text-gray-400" />
            <p className="text-gray-500 text-xs mb-1">Este mês</p>
            <p className="text-2xl font-bold text-gray-900">R$ {thisMonthSavings.toFixed(2)}</p>
            {savingsChange !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className={`w-3 h-3 ${savingsChange > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                <span className={`text-xs font-medium ${savingsChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Math.abs(savingsChange).toFixed(0)}%
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Economia nos últimos {isPremium ? '6' : '1'} {isPremium ? 'meses' : 'mês'}</h3>
            {!isPremium && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>
          {canViewFullHistory ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
                <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                <Tooltip 
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Economia']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
                />
                <Bar dataKey="savings" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Economia']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
                  />
                  <Bar dataKey="savings" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link to={createPageUrl('Planos')}>
                  <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50">
                    Ver histórico completo com Premium
                  </Button>
                </Link>
              </div>
            </>
          )}
        </motion.div>

        {/* Recent Comparisons */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Comparações recentes</h3>
            {!isPremium && snapshots.length > 3 && (
              <span className="text-xs text-gray-500">
                +{snapshots.length - 3} ocultas
              </span>
            )}
          </div>
          {snapshots.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Nenhuma comparação ainda</h4>
              <p className="text-sm text-gray-500 mb-4">
                Faça sua primeira comparação e comece a economizar
              </p>
              <Link to={createPageUrl('MinhaLista')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Criar lista de compras
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.slice(0, canViewFullHistory ? 10 : 3).map((snapshot, i) => (
                <motion.div
                  key={snapshot.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="bg-white rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{snapshot.listName || 'Compra do dia'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(snapshot.date).toLocaleDateString('pt-BR')} • {snapshot.itemsCount} itens
                      </p>
                      {snapshot.marketChosen && (
                        <p className="text-xs text-gray-600 mt-1">📍 {snapshot.marketChosen}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600 flex items-center justify-end gap-1">
                        <TrendingUp className="w-4 h-4" />
                        R$ {snapshot.savings.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        de R$ {snapshot.totalCheapest.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {!canViewFullHistory && snapshots.length > 3 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent pointer-events-none"></div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-200">
                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      +{snapshots.length - 3} comparações
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Desbloqueie o histórico completo
                    </p>
                    <Link to={createPageUrl('Planos')}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        Ver Premium
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}