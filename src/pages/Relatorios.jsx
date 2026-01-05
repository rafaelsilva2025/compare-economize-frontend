import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Eye, MousePointer, BarChart3, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Relatorios() {
  const [period, setPeriod] = useState('30'); // 7, 30, 90, 'custom'

  // Mock data - replace with real data later
  const dailyData = useMemo(() => {
    const days = period === '7' ? 7 : period === '30' ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      visualizacoes: Math.floor(Math.random() * 100) + 20,
      cliques: Math.floor(Math.random() * 30) + 5,
      comparacoes: Math.floor(Math.random() * 40) + 10,
    }));
  }, [period]);

  const categoryData = [
    { name: 'Visualizações', value: 1247, color: '#3b82f6' },
    { name: 'Cliques', value: 489, color: '#10b981' },
    { name: 'Comparações', value: 756, color: '#8b5cf6' },
  ];

  const topProducts = [
    { name: 'Arroz Tipo 1', views: 234, clicks: 45, spent: 850.00 },
    { name: 'Feijão Preto', views: 189, clicks: 38, spent: 620.50 },
    { name: 'Óleo de Soja', views: 167, clicks: 32, spent: 450.00 },
    { name: 'Açúcar Cristal', views: 145, clicks: 28, spent: 380.00 },
    { name: 'Café Torrado', views: 123, clicks: 25, spent: 320.75 },
  ];

  const totalSpent = topProducts.reduce((sum, p) => sum + p.spent, 0);

  const conversionData = [
    { name: 'Visualizações', value: 1247 },
    { name: 'Cliques em detalhes', value: 489 },
    { name: 'Rotas iniciadas', value: 234 },
    { name: 'Comparações', value: 156 },
  ];

  const totals = useMemo(() => ({
    views: dailyData.reduce((sum, day) => sum + day.visualizacoes, 0),
    clicks: dailyData.reduce((sum, day) => sum + day.cliques, 0),
    comparisons: dailyData.reduce((sum, day) => sum + day.comparacoes, 0),
  }), [dailyData]);

  const avgDaily = useMemo(() => ({
    views: Math.round(totals.views / dailyData.length),
    clicks: Math.round(totals.clicks / dailyData.length),
    comparisons: Math.round(totals.comparisons / dailyData.length),
  }), [totals, dailyData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('DashboardEmpresa')}>
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <div>
                <h1 className="font-semibold text-gray-900">Relatórios e Análises</h1>
                <p className="text-xs text-gray-500">Acompanhe o desempenho do seu negócio</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Period Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Período:</span>
            </div>
            {['7', '30', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  period === days
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                Últimos {days} dias
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +12%
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Total de Visualizações</p>
            <p className="text-3xl font-bold text-gray-900">{totals.views.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Média de {avgDaily.views}/dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Total de Cliques</p>
            <p className="text-3xl font-bold text-gray-900">{totals.clicks.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Média de {avgDaily.clicks}/dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +15%
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Total de Comparações</p>
            <p className="text-3xl font-bold text-gray-900">{totals.comparisons.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Média de {avgDaily.comparisons}/dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +22%
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Investimento em Patrocínios</p>
            <p className="text-3xl font-bold text-gray-900">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-2">Total no período</p>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart - Visualizações ao longo do tempo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Visualizações ao Longo do Tempo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="visualizacoes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorViews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar Chart - Comparação de Métricas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Comparação de Métricas Diárias</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="visualizacoes" fill="#3b82f6" name="Visualizações" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cliques" fill="#10b981" name="Cliques" radius={[8, 8, 0, 0]} />
                <Bar dataKey="comparacoes" fill="#8b5cf6" name="Comparações" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie Chart - Distribuição */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição de Interações</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Funnel Chart - Conversão */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Funil de Conversão</h3>
            <div className="space-y-3">
              {conversionData.map((stage, index) => {
                const percentage = (stage.value / conversionData[0].value) * 100;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                      <span className="text-sm font-bold text-gray-900">{stage.value}</span>
                    </div>
                    <div className="h-12 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white font-semibold text-sm">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Taxa de conversão:</strong> {((conversionData[3].value / conversionData[0].value) * 100).toFixed(1)}%
              </p>
            </div>
          </motion.div>
        </div>

        {/* Top Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Produtos Mais Visualizados</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Posição</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Produto</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Visualizações</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cliques</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Investido</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.name} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{product.views}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{product.clicks}</td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-700">R$ {product.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {((product.clicks / product.views) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}