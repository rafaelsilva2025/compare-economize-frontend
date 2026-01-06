import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiRequest } from "@/api/apiClient";

/**
 * Regra:
 * - Se não estiver logado → login
 * - Se allowFree=true → libera (por enquanto)
 * - Se exigir plano → valida
 */

function getUserPlan(user) {
  if (!user) return "free";

  const raw =
    user.plan ||
    user.subscription_plan ||
    user.subscriptionPlan ||
    user.tier ||
    user.level ||
    user.plano ||
    "";

  const plan = String(raw).toLowerCase().trim();

  // ✅ ATUALIZADO: suporta "admin"
  if (["admin", "premium", "pro", "free"].includes(plan)) return plan;
  if (plan.includes("admin")) return "admin";
  if (plan.includes("premium")) return "premium";
  if (plan.includes("pro")) return "pro";

  return "free";
}

// ✅ NOVO (sem quebrar): detecta admin por múltiplos campos
function isAdminUser(user) {
  if (!user) return false;

  const plan = String(user.plan || "").toLowerCase().trim();
  const role = String(user.role || "").toLowerCase().trim();
  const type = String(user.type || "").toLowerCase().trim();
  const accountType = String(user.accountType || user.account_type || "").toLowerCase().trim();
  const email = String(user.email || "").toLowerCase().trim();

  // ✅ 1) por plano/role/type
  if (plan === "admin" || role === "admin" || type === "admin" || accountType === "admin") return true;

  // ✅ 2) por email fixo (se você quiser usar assim agora)
  // Você pediu: empresaslim@gmail.com
  if (email === "empresaslim@gmail.com") return true;

  return false;
}

export function PlanRoute({
  children,
  allow = ["pro", "premium"],
  allowFree = false, // 👈 NOVO
}) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  // ✅ NOVO: estado para carregar user do backend se localStorage estiver vazio/desatualizado
  const [userState, setUserState] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // ✅ tenta pegar user salvo (se existir)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // ❌ não logado
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ✅ NOVO: se não tiver user salvo, ou se estiver incompleto, busca do backend
  useEffect(() => {
    let mounted = true;

    const needsFetch =
      !user ||
      !user.email ||
      (!user.plan && !user.subscription_plan && !user.subscriptionPlan && !user.tier && !user.level);

    if (!needsFetch) return;

    (async () => {
      try {
        setLoadingUser(true);
        const me = await apiRequest("/api/auth/me", { method: "GET" });

        if (!mounted) return;

        setUserState(me || null);

        // ✅ mantém o comportamento antigo: salva em localStorage se quiser
        try {
          localStorage.setItem("user", JSON.stringify(me || null));
        } catch {}
      } catch (e) {
        if (!mounted) return;
        setUserState(null);
      } finally {
        if (!mounted) return;
        setLoadingUser(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ escolhe o melhor user disponível
  const finalUser = useMemo(() => {
    return userState || user || null;
  }, [userState, user]);

  const plan = getUserPlan(finalUser);

  // ✅ enquanto carrega /api/auth/me, evita redirecionar cedo demais
  if (loadingUser && !finalUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Carregando...
      </div>
    );
  }

  // ✅ ADMIN BYPASS: admin entra em tudo, independente de allowFree/allow
  if (isAdminUser(finalUser) || plan === "admin") {
    return children;
  }

  // 🔓 LIBERA SE allowFree = true
  if (allowFree) {
    return children;
  }

  const allowed = (allow || []).map((p) => String(p).toLowerCase());
  const ok = allowed.includes(plan);

  if (!ok) {
    return (
      <Navigate
        to="/PlanosEmpresas"
        replace
        state={{
          from: location.pathname,
          required: allowed,
          current: plan,
        }}
      />
    );
  }

  return children;
}
