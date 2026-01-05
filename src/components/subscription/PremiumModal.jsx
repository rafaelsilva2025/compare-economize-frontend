import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X } from 'lucide-react';

export default function PremiumModal({ 
  open, 
  onClose, 
  feature,
  description 
}) {
  const benefits = [
    'Alertas de preço ilimitados',
    'Histórico completo de economia',
    'Economia estimada do mês',
    'Relatórios personalizados',
    'Comparações salvas ilimitadas',
    'Prioridade em novos recursos'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Recurso Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {feature && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-900 mb-1">
                {feature}
              </p>
              <p className="text-xs text-emerald-700">
                {description || 'Disponível apenas no plano Premium'}
              </p>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Desbloqueie alertas ilimitados e acompanhe sua economia mês a mês
            </h4>
            
            <ul className="space-y-2">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-1">R$ 9,90/mês</p>
            <p className="text-xs text-gray-500">Cancele quando quiser</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-11"
            >
              Continuar grátis
            </Button>
            <Link to={createPageUrl('Planos')} className="flex-1">
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 h-11"
                onClick={onClose}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Ver planos
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}