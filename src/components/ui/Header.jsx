import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MapPin,
  User,
  TrendingUp,
  Sparkles,
  Building2,
  LayoutDashboard,
  Crown,
  LogOut,
} from "lucide-react";
import { useAccountType } from "@/components/auth/useAccountType";
import { checkPremium } from "@/components/premium/premiumUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ✅ ajuste se você já tiver VITE_API_URL no .env do front
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isBusiness, isUser, isLoading, user } = useAccountType();

  // Check premium status for regular users
  const { data: isPremium = false } = useQuery({
    queryKey: ["isPremium"],
    queryFn: () => checkPremium(),
    enabled: !!isUser,
  });

  // ✅ Buscar economia total (apenas se for usuário logado)
  const { data: savingsData } = useQuery({
    queryKey: ["savingsTotal"],
    enabled: !!isUser,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return { total_saved: 0 };

      const res = await fetch(`${API_URL}/api/savings/total`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        return { total_saved: 0 };
      }

      return res.json();
    },
    staleTime: 30_000,
  });

  const totalSaved = Number(savingsData?.total_saved || 0);

  const formatBRL = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // =========================
  // ✅ helpers para botões de teste
  // =========================
  const isActiveDebug = (key) => {
    const path = location.pathname || "";
    const search = location.search || "";

    if (key === "user") {
      return path.toLowerCase().includes("/planosusuarios");
    }
    if (key === "pro") {
      return (
        path.toLowerCase().includes("/planosempresas") &&
        search.toLowerCase().includes("plan=pro")
      );
    }
    if (key === "premium") {
      return (
        path.toLowerCase().includes("/planosempresas") &&
        search.toLowerCase().includes("plan=premium")
      );
    }
    return false;
  };

  const debugBtnBase =
    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition";

  // =========================
  // ✅ LOGOUT (novo)
  // =========================
  const handleLogout = () => {
    // limpa auth
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("signup_account_type");

    // limpa queries que dependem do usuário
    try {
      queryClient.removeQueries({ queryKey: ["isPremium"] });
      queryClient.removeQueries({ queryKey: ["savingsTotal"] });
      // se você tiver outras queries do usuário:
      // queryClient.clear();
    } catch (e) {
      // ignore
    }

    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100/50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-base tracking-tight">
            Compare<span className="text-emerald-600">Economize</span>
          </span>
        </Link>

        {/* Menu */}
        <div className="flex items-center gap-2">
          {/* ========================= */}
          {/* 🔧 BOTÕES DE TESTE (DEBUG) */}
          {/* ========================= */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button
              onClick={() => navigate("/PlanosUsuarios")}
              className={`${debugBtnBase} ${
                isActiveDebug("user")
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Usuário
            </button>

            <button
              onClick={() => navigate("/PlanosEmpresas?plan=pro")}
              className={`${debugBtnBase} ${
                isActiveDebug("pro")
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Empresa Pro
            </button>

            <button
              onClick={() => navigate("/PlanosEmpresas?plan=premium")}
              className={`${debugBtnBase} flex items-center gap-1 ${
                isActiveDebug("premium")
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <Crown className="w-3 h-3" />
              Empresa Premium
            </button>
          </div>

          {/* ========================= */}
          {/* BUSINESS USER MENU */}
          {/* ========================= */}
          {isBusiness && (
            <>
              <Link
                to="/DashboardEmpresa"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Link
                to="/PlanosEmpresas"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Planos</span>
              </Link>

              <Link
                to="/Sobre"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                Sobre
              </Link>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                <Building2 className="w-3 h-3" />
                Empresa
              </div>
            </>
          )}

          {/* ========================= */}
          {/* REGULAR USER MENU */}
          {/* ========================= */}
          {isUser && (
            <>
              <Link
                to="/minha-economia"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Minha economia</span>
              </Link>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                {formatBRL(totalSaved)}
              </div>

              {isPremium && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Premium
                </span>
              )}

              <Link
                to="/PlanosUsuarios"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                Planos
              </Link>

              <Link
                to="/Sobre"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                Sobre
              </Link>
            </>
          )}

          {/* ========================= */}
          {/* GUEST MENU */}
          {/* ========================= */}
          {!user && !isLoading && (
            <>
              <Link
                to="/PlanosUsuarios"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                Planos
              </Link>

              <Link
                to="/Sobre"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                Sobre
              </Link>

              <Link
                to="/entrar"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm font-medium text-white"
              >
                <User className="w-4 h-4" />
                Entrar
              </Link>
            </>
          )}

          {/* ========================= */}
          {/* ✅ LOGADO: botão SAIR (novo) */}
          {/* ========================= */}
          {!!user && !isLoading && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold text-red-700"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
