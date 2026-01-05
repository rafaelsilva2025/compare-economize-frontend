import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlanCard({ 
  plan, 
  isCurrentPlan, 
  isPremium, 
  onSelect,
  delay = 0 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative bg-white rounded-2xl p-6 border transition-all ${
        isPremium 
          ? 'border-emerald-300 shadow-lg shadow-emerald-100 ring-2 ring-emerald-200' 
          : 'border-gray-200 shadow-sm'
      }`}
    >
      {isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3" />
            Mais popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          {isPremium && <span className="text-xl">⭐</span>}
        </div>
        
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-bold text-gray-900">
            R$ {plan.price.toFixed(2)}
          </span>
          {plan.price > 0 && (
            <span className="text-gray-500">/mês</span>
          )}
        </div>
        
        {isCurrentPlan && (
          <span className="inline-block bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium mt-2">
            Plano atual
          </span>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features?.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className={`w-5 h-5 flex-shrink-0 ${isPremium ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`w-full h-11 rounded-xl font-semibold ${
          isPremium
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md'
            : isCurrentPlan
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        {isCurrentPlan ? 'Plano atual' : isPremium ? 'Assinar Premium' : 'Começar grátis'}
      </Button>

      {isPremium && (
        <p className="text-center text-xs text-gray-500 mt-3">
          Cancele quando quiser • Sem compromisso
        </p>
      )}
    </motion.div>
  );
}