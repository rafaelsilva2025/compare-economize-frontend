import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PremiumBanner({ variant = 'full', feature }) {
  const features = {
    'price-alerts': {
      title: 'Alertas de preço',
      description: 'Seja notificado quando o preço cair',
      icon: '🔔',
    },
    'full-history': {
      title: 'Histórico completo',
      description: 'Veja sua economia de todos os tempos',
      icon: '📊',
    },
    'item-comparison': {
      title: 'Comparação por item',
      description: 'Descubra o melhor preço para cada produto',
      icon: '🔍',
    },
    'unlimited-lists': {
      title: 'Listas ilimitadas',
      description: 'Crie quantas listas quiser',
      icon: '📋',
    },
  };

  const currentFeature = features[feature] || features['price-alerts'];

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{currentFeature.title}</p>
              <p className="text-xs text-amber-700">{currentFeature.description}</p>
            </div>
          </div>
          <Link to={createPageUrl('Planos')}>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Premium
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Crown className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">Desbloqueie recursos Premium</h3>
          <p className="text-amber-100 text-sm">
            Alertas de preço, histórico completo e muito mais
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {Object.values(features).map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-amber-50">
            <Sparkles className="w-4 h-4" />
            <span>{f.icon} {f.title}</span>
          </div>
        ))}
      </div>

      <Link to={createPageUrl('Planos')}>
        <Button className="w-full bg-white text-amber-700 hover:bg-amber-50">
          Ver planos Premium
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}