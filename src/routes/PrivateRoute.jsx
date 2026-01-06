import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "@/api/apiClient";

// ✅ ADMIN fixo (fallback)
// (se quiser deixar ainda melhor, depois eu te ensino a vir do backend via isAdmin=true)
const ADMIN_EMAIL = "empresaslim@gmail.com";

export function PrivateRoute({ children, requirePlan = null }) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);

  // ✅ mantém seu comportamento atual: sem token -> login
  if (!token) return <Navigate to="/login" replace />;

  // ✅ Se não tem regra de plano, mantém seu comportamento original (libera)
  // Porém, pra suportar admin e páginas com plano, buscamos /api/auth/me
  useEffect(() => {
    let mounted = true;

    const fetchMe = async () => {
      try {
        const user = await apiRequest("/api/auth/me", { method: "GET" });
        if (!mounted) return;
        setMe(user || null);
      } catch (e) {
        if (!mounted) return;
        setMe(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchMe();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ enquanto carrega, evita piscar/redirecionar errado
  if (loading) return null;

  // ✅ se falhar o /me, joga pro login (token inválido/expirado)
  if (!me) return <Navigate to="/login" replace />;

  // ✅ ADMIN bypass: entra em qualquer rota sem pagar
  const email = String(me?.email || "").toLowerCase().trim();
  const isAdmin =
    me?.isAdmin === true ||
    String(me?.role || "").toLowerCase().trim() === "admin" ||
    email === ADMIN_EMAIL;

  if (isAdmin) return children;

  // ✅ Se a rota não exige plano específico, libera
  if (!requirePlan) return children;

  // ✅ regra de plano (aceita string ou array)
  const userPlan = String(me?.plan || "free").toLowerCase().trim();
  const allowed = Array.isArray(requirePlan)
    ? requirePlan.map((p) => String(p).toLowerCase().trim())
    : [String(requirePlan).toLowerCase().trim()];

  if (!allowed.includes(userPlan)) {
    // ✅ manda pra planos (pode trocar para "/planos-empresas" se preferir)
    return <Navigate to="/PlanosEmpresas" replace />;
  }

  return children;
}
