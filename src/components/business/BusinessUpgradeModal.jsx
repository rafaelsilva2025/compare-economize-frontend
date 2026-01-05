import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Check, X, Crown, TrendingUp, BarChart3, Star } from 'lucide-react';

export default function BusinessUpgradeModal({ open, onClose, feature = 'edit-prices', requiredTier = 'pro' }) {
  const featureInfo = {
    'edit-prices': {
      title: 'Editar Preços dos Produtos',
      description: 'Mantenha seus preços atualizados e atraia mais clientes',
      benefits: [
        'Atualize preços em tempo real',
        'Badge "Preço atualizado"',
        'Prioridade nas comparações',
      ],
      minTier: 'pro',
    },
    'sponsor': {
      title: 'Destaque Patrocinado',
      description: 'Apareça no topo das listas e aumente suas vendas',
      benefits: [
        'Destaque no topo das buscas',
        'Mais visibilidade para seu negócio',
        'Relatórios completos de performance',
      ],
      minTier: 'premium',
    },
    'reports': {
      title: 'Relatórios Completos',
      description: 'Analise o desempenho do seu estabelecimento',
      benefits: [
        'Visualizações detalhadas',
        'Métricas de conversão',
        'Insights de comportamento',
      ],
      minTier: 'premium',
    },
  };

  const currentFeature = featureInfo[feature] || featureInfo['edit-prices'];
  const isPremiumRequired = requiredTier === 'premium' || currentFeature.minTier === 'premium';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Recurso {isPremiumRequired ? 'Premium' : 'Pro'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              isPremiumRequired
                ? 'bg-gradient-to-br from-purple-100 to-pink-100'
                : 'bg-gradient-to-br from-blue-100 to-indigo-100'
            }`}>
              {isPremiumRequired ? (
                <Crown className="w-8 h-8 text-purple-600" />
              ) : (
                <Building2 className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentFeature.title}
            </h3>
            <p className="text-gray-600">
              {currentFeature.description}
            </p>
          </div>

          <div className={`rounded-2xl p-6 mb-6 ${
            isPremiumRequired
              ? 'bg-gradient-to-br from-purple-50 to-pink-50'
              : 'bg-gradient-to-br from-blue-50 to-indigo-50'
          }`}>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">
                R$ {isPremiumRequired ? '59,90' : '29,90'}
              </span>
              <span className="text-gray-600">/mês</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Plano Empresa {isPremiumRequired ? 'Premium' : 'Pro'}
            </p>

            <div className="space-y-3">
              {currentFeature.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPremiumRequired ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <Check className={`w-3 h-3 ${
                      isPremiumRequired ? 'text-purple-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-6 text-base rounded-xl"
            >
              Fechar
            </Button>
            <Link to={createPageUrl('PlanosEmpresas')} className="flex-1">
              <Button className={`w-full py-6 text-base rounded-xl shadow-lg ${
                isPremiumRequired
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}>
                {isPremiumRequired ? (
                  <Crown className="w-5 h-5 mr-2" />
                ) : (
                  <Building2 className="w-5 h-5 mr-2" />
                )}
                Fazer Upgrade
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}