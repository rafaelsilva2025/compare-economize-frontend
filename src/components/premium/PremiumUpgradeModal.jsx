import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PremiumUpgradeModal({ open, onClose, feature = 'alerts', planType = 'user' }) {
  const featureInfo = {
    alerts: {
      title: 'Alertas Ilimitados',
      description: 'Receba notificações quando os preços caírem nos seus produtos favoritos',
      benefits: [
        'Alertas ilimitados de preços',
        'Notificações em tempo real',
        'Acompanhe múltiplos produtos',
      ]
    },
    'price-alerts': {
      title: 'Alertas Ilimitados',
      description: 'Receba notificações quando os preços caírem nos seus produtos favoritos',
      benefits: [
        'Alertas ilimitados de preços',
        'Notificações em tempo real',
        'Acompanhe múltiplos produtos',
      ]
    },
    history: {
      title: 'Histórico Completo',
      description: 'Acesse todo seu histórico de comparações sem limites de tempo',
      benefits: [
        'Histórico completo sem restrições',
        'Acompanhe sua economia no tempo',
        'Relatórios detalhados',
      ]
    },
    'full-history': {
      title: 'Histórico Completo',
      description: 'Acesse todo seu histórico de comparações sem limites de tempo',
      benefits: [
        'Histórico completo sem restrições',
        'Acompanhe sua economia no tempo',
        'Relatórios detalhados',
      ]
    },
    item_comparison: {
      title: 'Comparação por Item',
      description: 'Veja o preço de cada produto individualmente em todos os locais',
      benefits: [
        'Preço por item detalhado',
        'Identifique os melhores lugares',
        'Economize em cada produto',
      ]
    },
    'item-comparison': {
      title: 'Comparação por Item',
      description: 'Veja o preço de cada produto individualmente em todos os locais',
      benefits: [
        'Preço por item detalhado',
        'Identifique os melhores lugares',
        'Economize em cada produto',
      ]
    },
    hotel_filters: {
      title: 'Filtros Avançados de Hotéis',
      description: 'Filtre hotéis por avaliação e comodidades',
      benefits: [
        'Filtre por avaliação mínima',
        'Selecione comodidades desejadas',
        'Alertas de queda de preço',
      ]
    },
  };

  const info = featureInfo[feature] || featureInfo.alerts;
  const price = planType === 'user' ? '9,90' : '29,90';
  const planName = planType === 'user' ? 'Pro' : 'Empresa Pro';
  const planRoute = planType === 'user' ? 'PlanosUsuarios' : 'PlanosEmpresas';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-600" />
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {info.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <p className="text-gray-600 mb-6">{info.description}</p>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Com o Plano {planName} você terá:</p>
            <ul className="space-y-2">
              {info.benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="w-3 h-3 text-amber-700" />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-gray-900">R$ {price}</span>
              <span className="text-gray-500">/mês</span>
            </div>
            <p className="text-xs text-gray-500">Cancele quando quiser</p>
          </div>

          <div className="flex gap-3">
            <Link to={createPageUrl(planRoute)} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 py-6 rounded-xl shadow-lg shadow-amber-200">
                <Crown className="w-5 h-5 mr-2" />
                Assinar {planName}
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-6 rounded-xl border-2"
            >
              Continuar grátis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}