import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import { useAccountType } from '@/components/auth/useAccountType';
import { ArrowLeft, Check, Crown, Sparkles, TrendingDown, MapPin, ShoppingBag, Bell, History, Heart, Hotel, Star, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createPixPayment } from '@/lib/payments';

export default function PlanosUsuarios() {
  const navigate = useNavigate();
  const { isBusiness, isLoading: isLoadingAccountType } = useAccountType();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // Redirect business users to business plans
  useEffect(() => {
    if (!isLoadingAccountType && isBusiness) {
      navigate(createPageUrl('PlanosEmpresas'));
    }
  }, [isBusiness, isLoadingAccountType, navigate]);

  // ✅ Fetch user (SEM base44) — só se tiver token
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          return;
        }

        // ✅ padroniza com seu Login.jsx (usa /api/auth/me)
        const user = await apiRequest("/api/auth/me", { method: "GET" });
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    };
    fetchUser();
  }, []);

  // ✅ Subscription (SEM base44)
  // - slot caso exista GET /api/subscriptions/me  -> { status: 'active', plan: 'premium' }
  // - se não existir, funciona via currentUser.plan
  const { data: subscription } = useQuery({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return null;

        const subs = await apiRequest("/api/subscriptions/me", { method: "GET" });
        return subs || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  // ✅ regra final do Premium:
  const isPremium =
    (subscription && subscription.status === 'active' && String(subscription.plan || '').toLowerCase().includes('premium')) ||
    (currentUser && String(currentUser.plan || '').toLowerCase().includes('premium'));

  const plans = [
    {
      name: 'Gratuito',
      price: 0,
      description: 'Para começar a economizar',
      icon: ShoppingBag,
      color: 'gray',
      features: [
        { text: 'Comparar preços', icon: TrendingDown },
        { text: 'Distância dinâmica', icon: MapPin },
        { text: 'Criar listas', icon: ShoppingBag },
        { text: 'Salvar comparações', icon: Check },
        { text: '1 alerta de preço ativo', icon: Bell, limit: true },
        { text: 'Histórico limitado (30 dias)', icon: History, limit: true },
      ],
    },
    {
      name: 'Premium',
      price: 9.90,
      description: 'Máxima economia e conveniência',
      icon: Crown,
      color: 'amber',
      popular: true,
      features: [
        { text: 'Tudo do plano Gratuito', icon: Check },
        { text: 'Alertas ilimitados', icon: Bell, premium: true },
        { text: 'Histórico completo', icon: History, premium: true },
        { text: 'Comparação por item', icon: Sparkles, premium: true },
        { text: 'Favoritos ilimitados', icon: Heart, premium: true },
        { text: 'Hotéis com filtros avançados', icon: Hotel, premium: true },
        { text: 'Suporte prioritário', icon: Star, premium: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    console.log('SUBSCRIBE_CLICK', { plan: 'premium', kind: 'user', isAuthenticated });

    if (!isAuthenticated) {
      toast.error('Entre ou crie sua conta para assinar o Premium');
      navigate(createPageUrl('CriarConta'));
      return;
    }

    if (isPremium) {
      toast.success("Você já está no Premium ✅");
      return;
    }

    try {
      setIsCreatingPayment(true);

      const toastId = toast.loading('Abrindo checkout do Mercado Pago...');

      // ✅ cria preferência no backend e redireciona para init_point
      // ✅ ATUALIZADO: body como objeto (apiClient já transforma em JSON)
      const resp = await apiRequest("/api/billing/create-user", {
        method: "POST",
        body: {
          plan: "premium",
          // ✅ TESTE USUÁRIO: R$ 1,00
          price: 1.00,
        },
      });

      toast.dismiss(toastId);

      if (resp?.init_point) {
        toast.success("Redirecionando para pagamento...");
        window.location.href = resp.init_point; // ✅ checkout Mercado Pago
        return;
      }

      console.warn("Backend não retornou init_point. Resp:", resp);
      toast.error("Não foi possível gerar o link do Mercado Pago.");

      // ✅ (mantido, mas NÃO usado) fallback antigo:
      // const payload = {
      //   plan_code: 'user_premium',
      //   kind: 'user',
      //   name: currentUser?.full_name || currentUser?.name || currentUser?.email,
      //   email: currentUser?.email,
      //   user_id: currentUser?.id,
      // };
      // const payment = await createPixPayment(payload);
      // navigate(createPageUrl('Pagamento') + `?payment=${payment.internal_id}`);

    } catch (error) {
      console.error('PAYMENT_ERROR', error);
      toast.error('Não foi possível iniciar o pagamento. Tente novamente.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Planos para Usuários</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full mb-6">
            <Crown className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Economize mais com Premium</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Compare preços gratuitamente ou desbloqueie recursos avançados com o Premium
          </p>

          <Button
            variant="outline"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            onClick={() => window.location.href = createPageUrl('PlanosEmpresas')}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Para Empresas
          </Button>

          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">
                Plano atual: <span className="font-semibold text-gray-900">
                  {isPremium ? 'Premium' : 'Gratuito'}
                </span>
              </span>
            </div>
          )}
        </motion.div>

        {/* Plans Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {plans.map((plan, i) => {
            const isCurrentPlan = isPremium ? plan.name === 'Premium' : plan.name === 'Gratuito';

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-3xl p-8 border-2 transition-all ${
                  plan.popular
                    ? 'border-amber-300 shadow-xl shadow-amber-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold rounded-full shadow-lg">
                      Mais popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-6 right-6">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      Plano atual
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                    plan.color === 'amber'
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                      : 'bg-gray-100'
                  }`}>
                    <plan.icon className={`w-7 h-7 ${
                      plan.color === 'amber' ? 'text-amber-600' : 'text-gray-600'
                    }`} />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      R$ {plan.price.toFixed(2)}
                    </span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        feature.limit
                          ? 'bg-gray-100'
                          : feature.premium
                            ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                            : 'bg-emerald-100'
                      }`}>
                        <feature.icon className={`w-3 h-3 ${
                          feature.limit
                            ? 'text-gray-600'
                            : feature.premium
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`} />
                      </div>
                      <span className={`text-sm ${
                        feature.limit ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {plan.name === 'Premium' ? (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isPremium || isCreatingPayment}
                    className={`w-full py-6 text-base rounded-2xl ${
                      isPremium
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-200'
                    }`}
                  >
                    {isPremium ? 'Plano atual' : (isCreatingPayment ? 'Abrindo checkout...' : 'Assinar Premium')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={!isPremium}
                    className="w-full py-6 text-base rounded-2xl border-2"
                  >
                    {!isPremium ? 'Plano atual' : 'Plano Gratuito'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Por que escolher o Premium?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Economize mais tempo e dinheiro com recursos exclusivos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Bell, title: 'Alertas Inteligentes', desc: 'Receba notificações quando os preços caírem nos seus produtos favoritos' },
              { icon: Sparkles, title: 'Comparação Detalhada', desc: 'Veja preço por item e economize em cada produto da sua lista' },
              { icon: History, title: 'Histórico Completo', desc: 'Acesse todo seu histórico de comparações e acompanhe sua economia' },
            ].map((benefit, i) => (
              <div key={i} className="bg-white rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Perguntas frequentes</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim, você pode cancelar sua assinatura a qualquer momento. Você continuará tendo acesso aos recursos Premium até o fim do período pago.' },
              { q: 'Como funciona o período de teste?', a: 'Novos usuários Premium ganham 7 dias grátis para testar todos os recursos. Cancele antes do fim do período e não será cobrado.' },
              { q: 'Posso usar no plano Gratuito para sempre?', a: 'Sim! O plano Gratuito é totalmente funcional e você pode usá-lo sem limitações de tempo.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">Pronto para economizar mais?</h2>
              <p className="text-amber-50 mb-6 max-w-xl mx-auto">
                Assine o Premium agora e comece a aproveitar todos os recursos exclusivos
              </p>
              <Button
                onClick={handleSubscribe}
                disabled={isCreatingPayment}
                className="bg-white text-amber-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-2xl font-semibold shadow-lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Assinar Premium
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
