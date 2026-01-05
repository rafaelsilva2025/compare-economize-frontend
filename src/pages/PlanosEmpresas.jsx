import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Crown,
  TrendingUp,
  Building2,
  BarChart3,
  MapPin,
  DollarSign,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createPixPayment } from '@/lib/payments'; // ✅ MANTIDO (não removi), mas agora vamos usar MP real

export default function PlanosEmpresas() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // ✅ ADICIONADO
  const selectedPlanParam = (searchParams.get("plan") || "").toLowerCase(); // pro | premium | basic
  const [user, setUser] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // ✅ refs para scroll automático
  const basicRef = useRef(null);
  const proRef = useRef(null);
  const premiumRef = useRef(null);

  // ✅ FALLBACK (aparece instantâneo) — EXATAMENTE como no print (cards)
  const fallbackPlans = [
    {
      id: 'basic',
      name: 'Empresa Grátis',
      tier: 'free',
      price: 0,
      features: [
        'Perfil público do estabelecimento',
        'Endereço, horário e rota',
        'Exibição básica nas buscas',
        'Sem edição de preços',
        'Sem destaque',
      ],
      type: 'business',
      isActive: true,
    },
    {
      id: 'pro',
      name: 'Empresa Pro',
      tier: 'pro',
      price: 29.9,
      features: [
        'Tudo do plano Grátis',
        'Editar preços dos produtos',
        'Badge "Preço atualizado"',
        'Prioridade nas comparações',
        'Estatísticas básicas (visualizações e cliques)',
      ],
      type: 'business',
      isActive: true,
    },
    {
      id: 'premium',
      name: 'Empresa Premium',
      tier: 'premium',
      price: 59.9,
      features: [
        'Tudo do Empresa Pro',
        'Destaque patrocinado',
        'Aparecer no topo das listas',
        'Relatórios completos',
        'Patrocínio de produtos',
      ],
      type: 'business',
      isActive: true,
    },
  ];

  // ✅ Fetch current user (SEM base44) — só se tiver token
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser(null);
          return;
        }

        console.time("GET /api/me");
        const currentUser = await apiRequest("/api/me");
        console.timeEnd("GET /api/me");

        setUser(currentUser);
      } catch (error) {
        console.timeEnd?.("GET /api/me");
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  // ✅ Fetch business plans (SEM base44) com cache e render instantâneo
  const { data: plans = fallbackPlans, isLoading } = useQuery({
    queryKey: ['businessPlans'],
    queryFn: async () => {
      console.time("GET /api/plans/business");
      try {
        const data = await apiRequest("/api/plans/business");
        console.timeEnd("GET /api/plans/business");

        if (Array.isArray(data) && data.length > 0) {
          const filtered = data.filter(p => (p.type ? p.type === 'business' : true) && (p.isActive ?? true));
          return filtered.length ? filtered : data;
        }

        return fallbackPlans;
      } catch (e) {
        console.timeEnd?.("GET /api/plans/business");
        console.error("ERRO AO BUSCAR PLANOS BUSINESS:", e);
        return fallbackPlans;
      }
    },
    initialData: fallbackPlans,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 30,
  });

  // ✅ Normalização: garante 3 cards exatamente como no print (mesmo se backend vier diferente)
  const plansNormalized = useMemo(() => {
    const norm = (v) => String(v || "").toLowerCase();

    const pickBasic =
      plans.find(p =>
        norm(p.id) === "basic" ||
        norm(p.tier) === "free" ||
        norm(p.name).includes("grátis") ||
        norm(p.name).includes("gratis") ||
        norm(p.name).includes("básico") ||
        norm(p.name).includes("basico")
      ) || fallbackPlans[0];

    const pickPro =
      plans.find(p =>
        norm(p.id) === "pro" ||
        norm(p.tier) === "pro" ||
        norm(p.name).includes("pro")
      ) || fallbackPlans[1];

    const pickPremium =
      plans.find(p =>
        norm(p.id) === "premium" ||
        norm(p.tier) === "premium" ||
        norm(p.name).includes("premium")
      ) || fallbackPlans[2];

    const basicFinal = {
      ...pickBasic,
      id: 'basic',
      tier: 'free',
      name: 'Empresa Grátis',
      price: 0,
      features: fallbackPlans[0].features,
      type: 'business',
      isActive: true,
    };

    const proFinal = {
      ...pickPro,
      id: 'pro',
      tier: 'pro',
      name: 'Empresa Pro',
      price: Number(pickPro.price ?? 29.9),
      features: fallbackPlans[1].features,
      type: 'business',
      isActive: true,
    };

    const premiumFinal = {
      ...pickPremium,
      id: 'premium',
      tier: 'premium',
      name: 'Empresa Premium',
      price: Number(pickPremium.price ?? 59.9),
      features: fallbackPlans[2].features,
      type: 'business',
      isActive: true,
    };

    return [basicFinal, proFinal, premiumFinal];
  }, [plans]);

  // ✅ scroll + destaque automático quando entrar pela URL (?plan=pro / premium)
  useEffect(() => {
    if (!selectedPlanParam) return;

    const map = {
      basic: basicRef,
      basico: basicRef,
      free: basicRef,
      gratis: basicRef,
      pro: proRef,
      premium: premiumRef,
    };

    const targetRef = map[selectedPlanParam];
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [selectedPlanParam]);

  // ✅ NOVO: cria pagamento REAL no Mercado Pago via backend
  const createMercadoPagoCheckout = async ({ planTier, price }) => {
    // backend exige: plan = "pro" | "premium"
    const plan = String(planTier || "").toLowerCase().includes("premium") ? "premium" : "pro";

    const res = await apiRequest("/api/billing/create", {
      method: "POST",
      body: JSON.stringify({
        plan,
        price: Number(price),
      }),
    });

    return res;
  };

  const handleSelectPlan = async (plan) => {
    console.log('SUBSCRIBE_CLICK - Plan object:', plan);
    console.log('SUBSCRIBE_CLICK - User:', user);

    // ✅ se não estiver logado, vai para tela do print (EscolherTipoConta) já no modo empresa
    if (!user) {
      toast.error('Crie uma conta empresarial para contratar um plano');
      navigate("/entrar?tipo=empresa"); // ✅ ALTERADO (era /empresa/criar-conta)
      return;
    }

    const priceNum = Number(plan?.price || 0);

    if (priceNum === 0) {
      toast.success('Plano Básico ativo! Configure seu estabelecimento.');
      return;
    }

    // ✅ aqui decidimos o plano real pro backend (pro/premium)
    const tierLower = String(plan?.tier || "").toLowerCase();
    const nameLower = String(plan?.name || "").toLowerCase();
    const idLower = String(plan?.id || "").toLowerCase();

    const isPremiumPlan =
      tierLower === "premium" ||
      idLower === "premium" ||
      nameLower.includes("premium");

    const selectedTier = isPremiumPlan ? "premium" : "pro";

    try {
      setIsCreatingPayment(true);
      toast.loading('Abrindo checkout do Mercado Pago...');

      // ✅ chama backend e recebe init_point
      const payment = await createMercadoPagoCheckout({
        planTier: selectedTier,
        price: priceNum,
      });

      console.log("MP_CREATE_RESPONSE", payment);

      toast.dismiss();

      const initPoint = payment?.init_point;
      if (!initPoint) {
        toast.error("Não veio init_point do servidor.");
        console.error("MP_CREATE_NO_INIT_POINT", payment);
        return;
      }

      toast.success("Redirecionando para o pagamento...");

      // ✅ Redireciona para o link real do MP
      window.location.href = initPoint;

      // ❗ não damos navigate depois disso porque a página vai mudar pro MP
    } catch (error) {
      console.error('PAYMENT_ERROR', error);
      toast.dismiss();
      toast.error(error?.message || 'Não foi possível iniciar o pagamento. Tente novamente.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // ✅ helper: define qual card está “selecionado” via URL
  const isSelected = (plan) => {
    const name = (plan.name || "").toLowerCase();
    const tier = (plan.tier || "").toLowerCase();
    const id = (plan.id || "").toLowerCase();

    if (!selectedPlanParam) return false;
    if (selectedPlanParam === "pro") return tier === "pro" || id === "pro" || name.includes("pro");
    if (selectedPlanParam === "premium") return tier === "premium" || id === "premium" || name.includes("premium");
    if (["basic", "basico", "free", "gratis"].includes(selectedPlanParam)) {
      return tier === "free" || id === "basic" || name.includes("grátis") || name.includes("gratis");
    }
    return false;
  };

  // ✅ Tabela compare
  const compareRows = useMemo(() => {
    const rows = [
      "Perfil público",
      "Endereço e horários",
      "Rota no Google Maps",
      "Atualizar preços",
      "Badge \"Preço atualizado\"",
      "Prioridade em comparações",
      "Estatísticas de visualizações",
      "Destaque patrocinado",
      "Topo das listas",
      "Relatórios completos",
      "Patrocínio de produtos",
    ];

    return rows.map((feature) => {
      const basic = ["Perfil público", "Endereço e horários", "Rota no Google Maps"].includes(feature);
      const pro = basic || ["Atualizar preços", "Badge \"Preço atualizado\"", "Prioridade em comparações", "Estatísticas de visualizações"].includes(feature);
      const premium = pro || ["Destaque patrocinado", "Topo das listas", "Relatórios completos", "Patrocínio de produtos"].includes(feature);
      return { feature, basic, pro, premium };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('PlanosUsuarios')}>
              <button type="button" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <h1 className="font-semibold text-gray-900">Planos para Empresas</h1>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span className="text-sm font-medium text-blue-900">Soluções B2B</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Destaque seu estabelecimento
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Aumente sua visibilidade, atraia mais clientes e mantenha seus preços sempre atualizados
          </p>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[
              { icon: MapPin, title: 'Maior visibilidade', desc: 'Apareça nas buscas de milhares de usuários' },
              { icon: DollarSign, title: 'Preços atualizados', desc: 'Mantenha sua base de preços sempre atual' },
              { icon: BarChart3, title: 'Relatórios', desc: 'Acompanhe visualizações e comparações' },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Plans — BASE EXATA (com os ajustes mínimos para seu projeto) */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <div className="bg-white rounded-2xl p-8 border border-gray-200 animate-pulse">
                <div className="h-24 bg-gray-100 rounded-xl mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                </div>
              </div>

              {/* mantém 3 skeletons no desktop, igual seu layout */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 animate-pulse hidden md:block">
                <div className="h-24 bg-gray-100 rounded-xl mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-gray-200 animate-pulse hidden md:block">
                <div className="h-24 bg-gray-100 rounded-xl mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded" />
                </div>
              </div>
            </>
          ) : plansNormalized.map((plan, i) => {
            const nameLower = String(plan.name || "").toLowerCase();
            const tierLower = String(plan.tier || "").toLowerCase();
            const idLower = String(plan.id || "").toLowerCase();

            const isPremium = nameLower.includes('premium') || tierLower === 'premium' || idLower === 'premium';
            const isPro = (!isPremium) && (nameLower.includes('pro') || tierLower === 'pro' || idLower === 'pro');
            const isBasic = (!isPremium && !isPro) && (tierLower === 'free' || idLower === 'basic' || nameLower.includes('grátis') || nameLower.includes('gratis') || nameLower.includes('básico') || nameLower.includes('basico'));

            const Icon = isBasic ? ShoppingBag : (isPro ? TrendingUp : (isPremium ? Crown : Building2));

            const selected = isSelected(plan);
            const cardRef = isPremium ? premiumRef : (isPro ? proRef : basicRef);

            const priceNum = Number(plan.price || 0);

            return (
              <motion.div
                key={plan.id}
                ref={cardRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`relative rounded-2xl p-8 border-2 transition-all hover:shadow-lg flex flex-col ${
                  isPremium
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 shadow-xl shadow-amber-200'
                    : isPro
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-300'
                      : 'bg-white border-gray-200'
                } ${selected ? 'ring-4 ring-blue-300/60' : ''}`}
              >
                {isPremium && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    Mais popular
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                    isPremium || isPro ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-7 h-7 ${
                      isPremium || isPro ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>

                  <h3 className={`text-2xl font-bold mb-2 ${isPremium || isPro ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-4xl font-bold ${isPremium || isPro ? 'text-white' : 'text-gray-900'}`}>
                      R$ {priceNum.toFixed(2)}
                    </span>
                    <span className={isPro ? 'text-emerald-100' : isPremium ? 'text-amber-100' : 'text-gray-600'}>/mês</span>
                  </div>

                  {priceNum === 0 && (
                    <p className="text-sm text-gray-600">Grátis para sempre</p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8 flex-1">
                  {(plan.features || []).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPremium || isPro ? 'text-white' : 'text-emerald-600'}`} />
                      <span className={`text-sm ${isPremium || isPro ? 'text-white' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  type="button" // ✅ ADICIONADO
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCreatingPayment && priceNum > 0}
                  style={{ height: '56px' }}
                  className={`w-full rounded-2xl font-semibold flex items-center justify-center transition-colors ${
                    isPremium
                      ? 'bg-white text-amber-700 hover:bg-gray-50'
                      : isPro
                        ? 'bg-white text-emerald-700 hover:bg-gray-50'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {priceNum === 0 ? 'Começar grátis' : (isCreatingPayment ? 'Abrindo checkout...' : 'Assinar agora')}
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ✅ Compare Table (igual print) */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Compare os planos</h2>
        </motion.div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-0 px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-700">Recurso</div>
            <div className="text-sm font-semibold text-gray-900 text-center">Básico</div>
            <div className="text-sm font-semibold text-gray-900 text-center">Pro</div>
            <div className="text-sm font-semibold text-gray-900 text-center">Premium</div>
          </div>

          {compareRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-0 px-6 py-4 border-b border-gray-50">
              <div className="text-sm text-gray-700">{row.feature}</div>

              <div className="text-center">
                {row.basic ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </div>

              <div className="text-center">
                {row.pro ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </div>

              <div className="text-center">
                {row.premium ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ FAQ (igual print) */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Perguntas frequentes</h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {[
            {
              q: "Como funciona o destaque patrocinado?",
              a: "Seu estabelecimento aparece no topo das listas de comparação e com destaque visual, aumentando significativamente a visibilidade.",
            },
            {
              q: "Posso trocar de plano a qualquer momento?",
              a: "Sim! Você pode fazer upgrade ou downgrade quando quiser. Mudanças são aplicadas no próximo ciclo de cobrança.",
            },
            {
              q: "Como atualizo os preços dos produtos?",
              a: "Com o plano Empresa Pro ou Empresa Premium, você terá acesso ao painel administrativo onde pode atualizar preços de forma rápida e fácil.",
            },
            {
              q: "O que é patrocínio de produtos?",
              a: "No Empresa Premium, você pode dar mais destaque a produtos específicos, aumentando as chances de cliques e conversões.",
            },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
              <p className="text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ CTA (igual print) */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">Pronto para crescer?</h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de estabelecimentos que já aumentaram sua visibilidade e atraíram mais clientes
          </p>

          {/* ✅ não usa createPageUrl('CriarContaEmpresa') pq essa página não existe no seu projeto */}
          <Link to="/empresa/criar-conta">
            <button type="button" className="bg-white text-blue-700 px-10 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-colors">
              Criar conta empresarial
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
