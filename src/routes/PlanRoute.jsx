import React from "react";
import { Navigate, useLocation } from "react-router-dom";

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

  if (["premium", "pro", "free"].includes(plan)) return plan;
  if (plan.includes("premium")) return "premium";
  if (plan.includes("pro")) return "pro";

  return "free";
}

export function PlanRoute({
  children,
  allow = ["pro", "premium"],
  allowFree = false, // 👈 NOVO
}) {
  const location = useLocation();

  const token = localStorage.getItem("token");

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

  // ✅ tenta pegar user salvo (se existir)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const plan = getUserPlan(user);

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
