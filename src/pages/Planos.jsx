import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { ArrowLeft, Sparkles, TrendingDown, Bell, BarChart3, Save } from 'lucide-react';
import PlanCard from '@/components/subscription/PlanCard';
import { motion } from 'framer-motion';

const mockPlans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    interval: 'monthly',
    features: [
      'Criar listas e comparações',
      'Comparar preços em todas as categorias',
      'Salvar economia',
      'Ver histórico (últimos 30 dias)',
      '1 alerta de preço ativo',
      'Acesso básico aos recursos'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.90,
    interval: 'monthly',
    features: [
      'Alertas de preço ilimitados',
      'Histórico completo (ilimitado)',
      'Economia estimada do mês',
      'Relatórios de economia',
      'Comparações salvas ilimitadas',
      'Prioridade em novos recursos',
      'Suporte prioritário'
    ]
  }
];

export default function Planos() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkUserPlan();
  }, []);

  const checkUserPlan = async () => {
    try {
      const token = localStorage.getItem("token");
      const isAuth = !!token;
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // ✅ valida token (se falhar, desloga)
        try {
          await apiRequest("/api/me", { method: "GET" });
        } catch (e) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          setCurrentPlan("free");
          return;
        }

        // ✅ aqui você pode trocar pra rota real quando existir:
        // GET /api/subscription/user/active
        // Por enquanto, mantém 'free' como padrão sem quebrar a tela.
        setCurrentPlan("free");
      }
    } catch (error) {
      console.error('Error checking plan:', error);
      setIsAuthenticated(false);
      setCurrentPlan("free");
    }
  };

  const handleSelectPlan = async (plan) => {
    if (!isAuthenticated) {
      window.location.href = createPageUrl('CriarConta');
      return;
    }

    if (plan.id === 'premium') {
      alert('Em breve! Integração com pagamento será adicionada.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Planos e Preços</h1>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Economize mais com o Premium</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para você
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Economize mais em todas as suas compras do dia a dia com alertas inteligentes
          </p>

          {/* Benefits Preview */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Bell, title: 'Alertas ilimitados', color: 'text-blue-600' },
              { icon: TrendingDown, title: 'Economia estimada', color: 'text-emerald-600' },
              { icon: BarChart3, title: 'Relatórios', color: 'text-purple-600' },
              { icon: Save, title: 'Comparações salvas', color: 'text-amber-600' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <item.icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
                <p className="text-xs text-gray-600">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {mockPlans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={plan.id === currentPlan}
              isPremium={plan.id === 'premium'}
              onSelect={handleSelectPlan}
              delay={0.2 + i * 0.1}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto mt-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Perguntas frequentes
          </h3>

          <div className="space-y-4">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim! Você pode cancelar sua assinatura Premium a qualquer momento, sem multas ou taxas adicionais.'
              },
              {
                q: 'Como funciona o alerta de preço?',
                a: 'Quando um produto que você está acompanhando abaixa de preço, enviamos uma notificação para você não perder a oportunidade.'
              },
              {
                q: 'O que acontece se eu cancelar?',
                a: 'Você continua com acesso Premium até o final do período pago. Depois, volta automaticamente para o plano gratuito.'
              },
              {
                q: 'Como o Premium me ajuda a economizar mais?',
                a: 'Com alertas ilimitados, você pode acompanhar todos os produtos que precisa. O histórico completo mostra padrões de preço, ajudando você a comprar no melhor momento.'
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white text-center mt-16"
        >
          <Sparkles className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">
            Pronto para economizar mais?
          </h3>
          <p className="text-emerald-100 mb-6 max-w-md mx-auto">
            Junte-se a milhares de pessoas que já estão economizando com alertas inteligentes
          </p>
          <Link to={createPageUrl('CriarConta')}>
            <button className="bg-white text-emerald-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              Começar agora
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
