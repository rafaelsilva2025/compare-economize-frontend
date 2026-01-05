import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function PagamentoSucesso() {
  const [paymentData, setPaymentData] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const internalId = urlParams.get('payment');

  const planDetails = {
    user_pro: { name: 'Usuário Pro', benefits: ['Histórico completo', 'Alertas ilimitados', 'Comparação detalhada'] },
    business_pro: { name: 'Empresa Pro', benefits: ['Atualizar preços', 'Estatísticas', 'Prioridade em buscas'] },
    business_premium: { name: 'Empresa Premium', benefits: ['Destaque patrocinado', 'Relatórios completos', 'Múltiplas filiais'] },
  };

  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Load payment data
    if (internalId) {
      const savedPayment = localStorage.getItem(`payment_${internalId}`);
      if (savedPayment) {
        setPaymentData(JSON.parse(savedPayment));
      }
    }

    // Clear payment data after 1 minute
    setTimeout(() => {
      if (internalId) {
        localStorage.removeItem(`payment_${internalId}`);
      }
    }, 60000);
  }, [internalId]);

  const plan = paymentData ? planDetails[paymentData.plan_code] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Success Icon */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Pagamento confirmado!
            </h1>
            <p className="text-emerald-50">
              Seu plano foi ativado com sucesso
            </p>
          </div>

          {/* Plan Details */}
          <div className="p-8">
            {plan && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-semibold mb-3">
                    <Sparkles className="w-4 h-4" />
                    {plan.name}
                  </div>
                  <p className="text-gray-600">
                    Agora você tem acesso a todos os recursos premium
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-8">
                  <p className="text-sm font-semibold text-gray-900 mb-3">O que você desbloqueou:</p>
                  {plan.benefits.map((benefit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 text-gray-700"
                    >
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* CTA */}
            <Link to={createPageUrl('Home')}>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 rounded-xl text-base">
                Continuar para o app
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}