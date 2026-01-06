import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { apiRequest } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccountType } from "@/components/auth/useAccountType";
import {
  ArrowLeft,
  Building2,
  Crown,
  TrendingUp,
  Eye,
  MousePointer,
  BarChart3,
  MapPin,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Store,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import SkeletonCard from "@/components/loading/SkeletonCard";
import { toast } from "sonner";
import ProductSponsorshipManager from "@/components/business/ProductSponsorshipManager";
import EditPriceButton from "@/components/business/EditPriceButton";

/**
 * ✅ helper para montar querystring (porque seu apiRequest pode não ter "params")
 */
function withQuery(path, params) {
  if (!params) return path;
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * ✅ fallback mock (pra você ver a página COMPLETA mesmo sem backend 100% pronto)
 * - Ativa automaticamente em DEV
 * - Se API responder, usa API
 */
const ENABLE_MOCK_FALLBACK = Boolean(import.meta?.env?.DEV);

/** ✅ mocks “parecidos com o print” */
const MOCK_USER = { id: "u_mock_1", email: "faeltrader2017@gmail.com" };

const MOCK_BUSINESS = {
  id: "b_mock_1",
  name: "Faros Supermercado",
  category: "Mercado",
  contactEmail: "empresaslim@gmail.com",
  phone: "",
  address: "Walter Hubacher 415 - Centro",
  city: "",
  state: "",
  zipCode: "",
  cnpj: "",
  inscricaoEstadual: "",
  isVerified: false,
};

const MOCK_MARKETS = [
  {
    id: "m1",
    name: "Altas Horas",
    addressLine: "R. Waldemar do Carmo Martins, 1403 - Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01000-000",
    phone: "(11) 99999-1111",
    category: "Mercado",
    email: "altashoras@exemplo.com",
    cnpj: "",
    inscricaoEstadual: "",
  },
  { id: "m2", name: "Supermercado Extra", addressLine: "", city: "", state: "", zipCode: "", phone: "", category: "Mercado" },
  { id: "m3", name: "Carrefour Express", addressLine: "", city: "", state: "", zipCode: "", phone: "", category: "Mercado" },
  { id: "m4", name: "Pão de Açúcar", addressLine: "", city: "", state: "", zipCode: "", phone: "", category: "Mercado" },
];

const MOCK_PLANS = [
  { id: "basic", name: "Básico", price: 0, features: ["Perfil público", "Endereço e horários", "Rota no Google Maps", "Aparecer em comparações"] },
  { id: "pro", name: "Pro", price: 39.9, features: ["Atualizar preços", 'Badge "Preço atualizado"', "Prioridade em comparações", "Estatísticas de visualizações"] },
  { id: "premium", name: "Premium", price: 59.9, features: ["Destaque patrocinado", "Topo das listas", "Relatórios completos", "Múltiplas filiais"] },
];

const MOCK_SUBSCRIPTION_INACTIVE = { id: "s_mock_1", status: "inactive", planId: "basic", plan: "basic" };

const MOCK_STATS = { views: 1247, clicks: 89, comparisons: 156 };

// ✅ NOVO (sem apagar nada): detecta admin igual o PlanRoute
function isAdminUser(user) {
  if (!user) return false;

  const plan = String(user.plan || "").toLowerCase().trim();
  const role = String(user.role || "").toLowerCase().trim();
  const type = String(user.type || "").toLowerCase().trim();
  const accountType = String(user.accountType || user.account_type || "").toLowerCase().trim();
  const email = String(user.email || "").toLowerCase().trim();

  if (plan === "admin" || role === "admin" || type === "admin" || accountType === "admin") return true;

  // ✅ seu admin fixo
  if (email === "empresaslim@gmail.com") return true;

  return false;
}

export default function DashboardEmpresa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ mantém seu hook (não removi nada)
  const { isBusiness, isUser, isLoading: isLoadingAccountType, user: userFromHook, business: businessFromHook } = useAccountType();

  // ✅ estados do Base44 (mantidos)
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [isEditingMarket, setIsEditingMarket] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    contactEmail: "",
  });

  // (mantido do seu código, mesmo se não usar diretamente)
  const [editMarketData, setEditMarketData] = useState({
    name: "",
    addressLine: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    category: "",
  });

  /**
   * ✅ Buscar usuário atual (API real)
   * - se falhar e estiver em DEV, cai no MOCK
   * - também reaproveita userFromHook como fallback
   */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // seu apiRequest no projeto tem assinatura: apiRequest(url, { method, body })
        const me = await apiRequest("/api/auth/me", { method: "GET" });
        if (mounted) setUser(me);

        // ✅ NOVO: garante que o PlanRoute/Front tenham user atualizado
        try {
          localStorage.setItem("user", JSON.stringify(me || null));
        } catch {}
      } catch (e) {
        // fallback: hook
        if (mounted && userFromHook) setUser(userFromHook);

        // fallback mock DEV
        if (mounted && !userFromHook && ENABLE_MOCK_FALLBACK) {
          setUser(MOCK_USER);
          toast.message("Modo teste: usando usuário fictício.");
        } else if (!userFromHook) {
          toast.error("Faça login para acessar o dashboard");
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [userFromHook]);

  // ✅ NOVO: flag admin
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  /**
   * ✅ Buscar empresas do usuário (API real)
   * Rotas tentadas:
   * 1) GET /api/business/my
   * 2) GET /api/business?ownerId=...
   * ✅ NOVO: (ADMIN) tenta GET /api/business/all
   * fallback mock em DEV
   */
  const {
    data: businesses = [],
    isLoading: isLoadingBusinesses,
  } = useQuery({
    queryKey: ["userBusinesses", user?.id, isAdmin],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      // ✅ ADMIN: tenta ver tudo (se existir a rota no backend)
      if (isAdmin) {
        try {
          const all = await apiRequest("/api/business/all", { method: "GET" });
          if (Array.isArray(all) && all.length > 0) return all;
        } catch (e) {
          // segue para os fallbacks antigos
        }
      }

      try {
        const list = await apiRequest("/api/business/my", { method: "GET" });
        return Array.isArray(list) ? list : [];
      } catch (e) {
        try {
          const url = withQuery("/api/business", { ownerId: user?.id });
          const list2 = await apiRequest(url, { method: "GET" });
          return Array.isArray(list2) ? list2 : [];
        } catch (e2) {
          if (ENABLE_MOCK_FALLBACK) return [MOCK_BUSINESS];
          return [];
        }
      }
    },
  });

  // Base44 pegava a primeira empresa
  // ✅ NOVO: admin também escolhe a primeira se existir
  const business = businesses?.[0] || businessFromHook || null;

  /**
   * ✅ Create business mutation (API real)
   * Rotas tentadas:
   * 1) POST /api/business
   * 2) POST /api/business/create
   */
  const createBusinessMutation = useMutation({
    mutationFn: async (data) => {
      // ownerId pode ser necessário no seu backend
      const payload = { ...data, ownerId: user?.id };

      try {
        return await apiRequest("/api/business", { method: "POST", body: payload });
      } catch (e) {
        return await apiRequest("/api/business/create", { method: "POST", body: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBusinesses"] });
      toast.success("Empresa cadastrada com sucesso!");
      setShowCreateModal(false);
      setFormData({ name: "", category: "", contactEmail: "" });
    },
    onError: () => {
      toast.error("Erro ao cadastrar empresa");
    },
  });

  const handleCreateBusiness = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.contactEmail) {
      toast.error("Preencha todos os campos");
      return;
    }
    createBusinessMutation.mutate({ ...formData });
  };

  /**
   * ✅ Subscription ativa (API real)
   * Rota:
   * GET /api/subscription/active?businessId=...
   * fallback mock
   */
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["businessSubscription", business?.id, isAdmin],
    enabled: !!business?.id,
    retry: false,
    queryFn: async () => {
      // ✅ NOVO: admin não depende de subscription para liberar UI
      if (isAdmin) {
        return {
          id: "admin_subscription",
          status: "active",
          planId: "premium",
          plan: "premium",
          admin: true,
        };
      }

      try {
        const url = withQuery("/api/subscription/active", { businessId: business.id });
        const res = await apiRequest(url, { method: "GET" });
        return res || null;
      } catch (e) {
        if (ENABLE_MOCK_FALLBACK) return MOCK_SUBSCRIPTION_INACTIVE;
        return null;
      }
    },
  });

  /**
   * ✅ Plans (API real)
   * GET /api/plans
   * fallback mock
   */
  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    retry: false,
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/plans", { method: "GET" });
        return Array.isArray(res) ? res : [];
      } catch (e) {
        if (ENABLE_MOCK_FALLBACK) return MOCK_PLANS;
        return [];
      }
    },
  });

  /**
   * ✅ Plan atual (derivado) - suporta plan / planId
   */
  const plan = useMemo(() => {
    const key = subscription?.planId ?? subscription?.plan ?? null;
    if (!key) return null;
    return plans.find((p) => p.id === key) || null;
  }, [plans, subscription?.planId, subscription?.plan]);

  /**
   * ✅ Markets da empresa (API real)
   * Rotas tentadas:
   * 1) GET /api/business/markets?businessId=...
   * 2) GET /api/business/{id}/markets
   * fallback mock
   */
  const { data: markets = [], isLoading: isLoadingMarkets } = useQuery({
    queryKey: ["businessMarkets", business?.id],
    enabled: !!business?.id,
    retry: false,
    queryFn: async () => {
      try {
        const url = withQuery("/api/business/markets", { businessId: business.id });
        const res = await apiRequest(url, { method: "GET" });
        return Array.isArray(res) ? res : [];
      } catch (e) {
        try {
          const res2 = await apiRequest(`/api/business/${business.id}/markets`, { method: "GET" });
          return Array.isArray(res2) ? res2 : [];
        } catch (e2) {
          if (ENABLE_MOCK_FALLBACK) return MOCK_MARKETS;
          return [];
        }
      }
    },
  });

  /**
   * ✅ Stats reais (API real)
   * GET /api/stats/business/:businessId?days=30
   * fallback mock
   */
  const { data: statsApi, isLoading: isLoadingStats } = useQuery({
    queryKey: ["businessStats", business?.id],
    enabled: !!business?.id,
    retry: false,
    queryFn: async () => {
      try {
        const url = withQuery(`/api/stats/business/${business.id}`, { days: 30 });
        return await apiRequest(url, { method: "GET" });
      } catch (e) {
        if (ENABLE_MOCK_FALLBACK) return { totals: MOCK_STATS };
        return null;
      }
    },
  });

  const stats = useMemo(() => {
    const fallback = MOCK_STATS;
    if (!statsApi) return fallback;

    const t = statsApi?.totals || {};
    const views = t.views ?? statsApi.views ?? fallback.views;
    const clicks = t.clicks ?? statsApi.clicks ?? fallback.clicks;
    const comparisons = t.comparisons ?? statsApi.comparisons ?? fallback.comparisons;

    return {
      views: Number.isFinite(Number(views)) ? Number(views) : fallback.views,
      clicks: Number.isFinite(Number(clicks)) ? Number(clicks) : fallback.clicks,
      comparisons: Number.isFinite(Number(comparisons)) ? Number(comparisons) : fallback.comparisons,
    };
  }, [statsApi]);

  /**
   * ✅ Update Market (API real)
   * Rotas tentadas:
   * PATCH /api/markets/:id
   * PUT /api/markets/:id
   * PATCH /api/market/:id
   */
  const updateMarketMutation = useMutation({
    mutationFn: async ({ marketId, data }) => {
      try {
        return await apiRequest(`/api/markets/${marketId}`, { method: "PATCH", body: data });
      } catch (e) {
        try {
          return await apiRequest(`/api/markets/${marketId}`, { method: "PUT", body: data });
        } catch (e2) {
          return await apiRequest(`/api/market/${marketId}`, { method: "PATCH", body: data });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessMarkets"] });
      toast.success("Estabelecimento atualizado com sucesso!");
      setSelectedMarket(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar estabelecimento");
    },
  });

  const handleSaveMarket = () => {
    if (!selectedMarket?.name) {
      toast.error("O nome é obrigatório");
      return;
    }
    updateMarketMutation.mutate({ marketId: selectedMarket.id, data: selectedMarket });
    setIsEditingMarket(false);
  };

  /**
   * ✅ Update Business (API real)
   * Rotas tentadas:
   * PATCH /api/business/:id
   * PUT /api/business/:id
   */
  const updateBusinessMutation = useMutation({
    mutationFn: async (data) => {
      if (!business?.id) throw new Error("Business inválido");
      try {
        return await apiRequest(`/api/business/${business.id}`, { method: "PATCH", body: data });
      } catch (e) {
        return await apiRequest(`/api/business/${business.id}`, { method: "PUT", body: data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBusinesses"] });
      toast.success("Empresa atualizada com sucesso!");
      setIsEditingBusiness(false);
      setEditedBusiness(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar empresa");
    },
  });

  const handleSaveBusiness = () => {
    if (!editedBusiness?.name || !editedBusiness?.category || !editedBusiness?.contactEmail) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    updateBusinessMutation.mutate(editedBusiness);
  };

  // ====== handlers Base44 (mantidos) ======
  const selectMarketForView = (market) => {
    setSelectedMarket(market);
    setIsEditingMarket(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditingMarket = () => setIsEditingMarket(true);

  const cancelEditingMarket = () => {
    setIsEditingMarket(false);
    setSelectedMarket(null);
  };

  const startEditingBusiness = () => {
    setEditedBusiness({ ...business });
    setIsEditingBusiness(true);
  };

  const cancelEditingBusiness = () => {
    setIsEditingBusiness(false);
    setEditedBusiness(null);
  };

  // ====== Plan visual ======
  // ✅ NOVO: admin sempre "Premium" na UI (não depende do backend)
  const forcedPlanNameForAdmin = "Premium";

  const currentPlanName = isAdmin ? forcedPlanNameForAdmin : (plan?.name || "Básico");

  const planColors = {
    Básico: { bg: "from-gray-50 to-gray-100", text: "text-gray-700", icon: Building2 },
    Pro: { bg: "from-blue-50 to-indigo-100", text: "text-blue-700", icon: TrendingUp },
    Premium: { bg: "from-amber-50 to-orange-100", text: "text-amber-700", icon: Crown },
  };
  const colors = planColors[currentPlanName] || planColors["Básico"];
  const PlanIcon = colors.icon;

  const planBenefits = {
    Básico: ["Perfil público", "Endereço e horários", "Rota no Google Maps", "Aparecer em comparações"],
    Pro: plan?.features || ["Atualizar preços", 'Badge "Preço atualizado"', "Prioridade em comparações", "Estatísticas de visualizações"],
    Premium: plan?.features || ["Destaque patrocinado", "Topo das listas", "Relatórios completos", "Múltiplas filiais"],
  };
  const currentPlanBenefits = planBenefits[currentPlanName] || planBenefits["Básico"];

  // ====== guard ======
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso restrito</h2>
          <p className="text-gray-500 mb-6">Faça login para acessar o dashboard</p>
          <Link to={createPageUrl("Home")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Ir para home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLoadingTop = isLoadingBusinesses || isLoadingSubscription;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900">Dashboard Empresarial</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>

              {/* ✅ NOVO: badge admin */}
              {isAdmin && (
                <div className="mt-1 inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-black text-white rounded-full text-[11px] font-semibold">
                    ADMIN
                  </span>
                  <span className="text-[11px] text-gray-500">Acesso total (sem pagamento)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoadingTop ? (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !business ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma empresa cadastrada</h2>
            <p className="text-gray-500 mb-8">Cadastre sua primeira empresa para começar</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateModal(true)}>
              <Building2 className="w-5 h-5 mr-2" />
              Cadastrar empresa
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Market/Business Card - Edit Area */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Editable Market Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                  selectedMarket ? "border-emerald-500 shadow-lg" : "border-gray-200"
                }`}
              >
                {selectedMarket ? (
                  <>
                    {isEditingMarket ? (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                              <Store className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-gray-900">Editando Estabelecimento</h2>
                              <p className="text-sm text-emerald-600">Altere os dados abaixo</p>
                            </div>
                          </div>
                          <button
                            onClick={cancelEditingMarket}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Nome *</label>
                            <Input
                              value={selectedMarket.name || ""}
                              onChange={(e) => setSelectedMarket({ ...selectedMarket, name: e.target.value })}
                              placeholder="Nome do estabelecimento"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria</label>
                              <Input
                                value={selectedMarket.category || ""}
                                onChange={(e) => setSelectedMarket({ ...selectedMarket, category: e.target.value })}
                                placeholder="Ex: Mercado"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Telefone</label>
                              <Input
                                value={selectedMarket.phone || ""}
                                onChange={(e) => setSelectedMarket({ ...selectedMarket, phone: e.target.value })}
                                placeholder="(11) 99999-9999"
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                            <Input
                              type="email"
                              value={selectedMarket.email || ""}
                              onChange={(e) => setSelectedMarket({ ...selectedMarket, email: e.target.value })}
                              placeholder="contato@estabelecimento.com"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Endereço</label>
                            <Input
                              value={selectedMarket.addressLine || ""}
                              onChange={(e) => setSelectedMarket({ ...selectedMarket, addressLine: e.target.value })}
                              placeholder="Rua, número, bairro"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Cidade</label>
                              <Input
                                value={selectedMarket.city || ""}
                                onChange={(e) => setSelectedMarket({ ...selectedMarket, city: e.target.value })}
                                placeholder="São Paulo"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
                              <Input
                                value={selectedMarket.state || ""}
                                onChange={(e) =>
                                  setSelectedMarket({ ...selectedMarket, state: e.target.value.toUpperCase() })
                                }
                                placeholder="SP"
                                maxLength={2}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">CEP</label>
                            <Input
                              value={selectedMarket.zipCode || ""}
                              onChange={(e) => setSelectedMarket({ ...selectedMarket, zipCode: e.target.value })}
                              placeholder="00000-000"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">CNPJ</label>
                              <Input
                                value={selectedMarket.cnpj || ""}
                                onChange={(e) => setSelectedMarket({ ...selectedMarket, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Inscrição Estadual</label>
                              <Input
                                value={selectedMarket.inscricaoEstadual || ""}
                                onChange={(e) =>
                                  setSelectedMarket({ ...selectedMarket, inscricaoEstadual: e.target.value })
                                }
                                placeholder="000.000.000.000"
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={cancelEditingMarket} className="flex-1">
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleSaveMarket}
                              disabled={updateMarketMutation.isPending}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              {updateMarketMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                              <Store className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-gray-900">{selectedMarket.name}</h2>
                              <p className="text-sm text-gray-500">{selectedMarket.category || "Sem categoria"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={startEditingMarket}
                              className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={cancelEditingMarket}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                              <ArrowLeft className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Telefone</p>
                              <p className="text-gray-900">{selectedMarket.phone || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Categoria</p>
                              <p className="text-gray-900">{selectedMarket.category || "Não informado"}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="text-gray-900">{selectedMarket.email || "Não informado"}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Endereço</p>
                            <p className="text-gray-900">{selectedMarket.addressLine || "Não informado"}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Cidade</p>
                              <p className="text-gray-900">{selectedMarket.city || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Estado</p>
                              <p className="text-gray-900">{selectedMarket.state || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">CEP</p>
                              <p className="text-gray-900">{selectedMarket.zipCode || "Não informado"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">CNPJ</p>
                              <p className="text-gray-900">{selectedMarket.cnpj || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Inscrição Estadual</p>
                              <p className="text-gray-900">{selectedMarket.inscricaoEstadual || "Não informado"}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {isEditingBusiness ? (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-gray-900">Editando Empresa</h2>
                              <p className="text-sm text-blue-600">Altere os dados abaixo</p>
                            </div>
                          </div>
                          <button
                            onClick={cancelEditingBusiness}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Nome da Empresa *</label>
                            <Input
                              value={editedBusiness?.name || ""}
                              onChange={(e) => setEditedBusiness({ ...editedBusiness, name: e.target.value })}
                              placeholder="Nome da empresa"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria *</label>
                              <Input
                                value={editedBusiness?.category || ""}
                                onChange={(e) => setEditedBusiness({ ...editedBusiness, category: e.target.value })}
                                placeholder="Ex: Mercado"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Telefone</label>
                              <Input
                                value={editedBusiness?.phone || ""}
                                onChange={(e) => setEditedBusiness({ ...editedBusiness, phone: e.target.value })}
                                placeholder="(11) 99999-9999"
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Email de Contato *</label>
                            <Input
                              type="email"
                              value={editedBusiness?.contactEmail || ""}
                              onChange={(e) =>
                                setEditedBusiness({ ...editedBusiness, contactEmail: e.target.value })
                              }
                              placeholder="contato@empresa.com"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Endereço</label>
                            <Input
                              value={editedBusiness?.address || ""}
                              onChange={(e) => setEditedBusiness({ ...editedBusiness, address: e.target.value })}
                              placeholder="Rua, número, bairro"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Cidade</label>
                              <Input
                                value={editedBusiness?.city || ""}
                                onChange={(e) => setEditedBusiness({ ...editedBusiness, city: e.target.value })}
                                placeholder="São Paulo"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
                              <Input
                                value={editedBusiness?.state || ""}
                                onChange={(e) =>
                                  setEditedBusiness({ ...editedBusiness, state: e.target.value.toUpperCase() })
                                }
                                placeholder="SP"
                                maxLength={2}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">CEP</label>
                            <Input
                              value={editedBusiness?.zipCode || ""}
                              onChange={(e) => setEditedBusiness({ ...editedBusiness, zipCode: e.target.value })}
                              placeholder="00000-000"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">CNPJ</label>
                              <Input
                                value={editedBusiness?.cnpj || ""}
                                onChange={(e) => setEditedBusiness({ ...editedBusiness, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Inscrição Estadual</label>
                              <Input
                                value={editedBusiness?.inscricaoEstadual || ""}
                                onChange={(e) =>
                                  setEditedBusiness({ ...editedBusiness, inscricaoEstadual: e.target.value })
                                }
                                placeholder="000.000.000.000"
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={cancelEditingBusiness} className="flex-1">
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleSaveBusiness}
                              disabled={updateBusinessMutation.isPending}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              {updateBusinessMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-gray-900">{business.name}</h2>
                              <p className="text-sm text-gray-500">{business.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={startEditingBusiness}
                              className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </button>
                            {business.isVerified ? (
                              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Verificado
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                                <AlertCircle className="w-3 h-3" />
                                Pendente
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Email</p>
                              <p className="text-gray-900">{business.contactEmail || business.contact_email || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Telefone</p>
                              <p className="text-gray-900">{business.phone || "Não informado"}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Endereço</p>
                            <p className="text-gray-900">{business.address || "Não informado"}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Cidade</p>
                              <p className="text-gray-900">{business.city || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Estado</p>
                              <p className="text-gray-900">{business.state || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">CEP</p>
                              <p className="text-gray-900">{business.zipCode || business.zip_code || "Não informado"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">CNPJ</p>
                              <p className="text-gray-900">{business.cnpj || "Não informado"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Inscrição Estadual</p>
                              <p className="text-gray-900">{business.inscricaoEstadual || business.inscricao_estadual || "Não informado"}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Store className="w-4 h-4" />
                              <span>
                                {markets.length} {markets.length === 1 ? "estabelecimento" : "estabelecimentos"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-blue-600">
                              💡 Clique em um estabelecimento abaixo para visualizar/editar
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </motion.div>

              {/* Plan Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-6 border border-gray-200`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                      <PlanIcon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Plano atual</p>
                      <h2 className="text-xl font-bold text-gray-900">{currentPlanName}</h2>
                    </div>
                  </div>
                  {subscription?.status === "active" ? (
                    <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Ativo</div>
                  ) : (
                    <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Inativo</div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {plan ? `R$ ${Number(plan.price).toFixed(2)}/mês` : "Plano gratuito"}
                </p>

                {/* Plan Benefits */}
                <div className="mb-4 space-y-2">
                  {currentPlanBenefits.slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link to={createPageUrl("PlanosEmpresas")}>
                  <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">Alterar plano</Button>
                </Link>
              </motion.div>
            </div>

            {/* Statistics */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Estatísticas dos últimos 30 dias</h3>
                {isLoadingStats && <span className="text-xs text-gray-500">Carregando...</span>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Visualizações</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.views}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Pessoas que viram seu estabelecimento</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <MousePointer className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cliques</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.clicks}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Cliques em rotas e detalhes</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Comparações</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.comparisons}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Vezes que apareceu em comparações</p>
                </div>
              </div>
            </motion.div>

            {/* Product Sponsorships Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Gerenciar Patrocínios</h3>
                <p className="text-sm text-gray-500">Destaque produtos específicos e aumente suas vendas</p>
              </div>
              <ProductSponsorshipManager businessId={business.id} marketId={markets[0]?.id} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Gerenciar Produtos */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Store className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Gerenciar Produtos</h4>
                      <p className="text-sm text-gray-500">Adicionar, editar e remover produtos</p>
                    </div>
                  </div>
                  <EditPriceButton businessId={business.id} marketId={markets[0]?.id} />
                </div>

                {/* Destaque Patrocinado */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-amber-200 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Destaque Patrocinado</h4>
                      <p className="text-sm text-gray-500">Aparecer no topo das comparações</p>
                    </div>
                  </div>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">Criar campanha</Button>
                </div>

                {/* Relatórios Completos */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Relatórios Completos</h4>
                      <p className="text-sm text-gray-500">Análises detalhadas e insights</p>
                    </div>
                  </div>
                  <Link to={createPageUrl("Relatorios")} className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Ver relatórios</Button>
                  </Link>
                </div>

                {/* Gerenciar Filiais */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-200 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Gerenciar Filiais</h4>
                      <p className="text-sm text-gray-500">Adicionar múltiplos estabelecimentos</p>
                    </div>
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <Building2 className="w-4 h-4 mr-2" />
                    Adicionar filial
                  </Button>
                </div>

                {/* Atualização em Lote */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Atualização em Lote</h4>
                      <p className="text-sm text-gray-500">Importar preços via planilha</p>
                    </div>
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Importar planilha</Button>
                </div>

                {/* Configurações */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Configurações</h4>
                      <p className="text-sm text-gray-500">Horários, contato e preferências</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Configurar
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Markets List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filiais ({markets.length})</h3>
                <Button variant="outline" className="text-sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {isLoadingMarkets ? (
                <div className="space-y-3">
                  <SkeletonCard variant="market" />
                  <SkeletonCard variant="market" />
                </div>
              ) : markets.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Nenhum estabelecimento</h4>
                  <p className="text-sm text-gray-500 mb-6">Cadastre seu primeiro estabelecimento</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Building2 className="w-4 h-4 mr-2" />
                    Cadastrar estabelecimento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {markets.slice(0, 5).map((market, i) => (
                    <motion.div
                      key={market.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
                        selectedMarket?.id === market.id
                          ? "border-emerald-500 shadow-md"
                          : "border-gray-200 hover:border-emerald-200 hover:shadow-sm"
                      }`}
                      onClick={() => selectMarketForView(market)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{market.name}</h4>
                            <p className="text-sm text-gray-500">{market.addressLine || "Endereço não cadastrado"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`${createPageUrl("MarketDetail")}?id=${market.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Create Business Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome da Empresa</label>
              <Input
                placeholder="Ex: Mercado São João"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Categoria</label>
              <Input
                placeholder="Ex: Mercado, Farmácia, Combustível"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email de Contato</label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createBusinessMutation.isPending}
              >
                {createBusinessMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
