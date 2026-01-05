import { apiRequest } from "@/api/apiClient";

/**
 * Esperado na sua API (ajuste as rotas se quiser):
 *
 * GET /api/subscription/me
 *  -> { tier: "free"|"pro", plan: {...} }  (para usuário logado)
 *
 * GET /api/subscription/business/:businessId
 *  -> { tier: "free"|"pro"|"premium", plan: {...} } (para empresa)
 *
 * Observação: se o usuário não estiver logado (sem token), apiRequest vai falhar
 * e nós retornamos "free".
 */

// Check user plan tier (free or pro)
export const checkUserPlan = async () => {
  try {
    const sub = await apiRequest("/api/subscription/me");
    return {
      tier: (sub?.tier || "free").toLowerCase(),
      plan: sub?.plan || null,
    };
  } catch {
    return { tier: "free", plan: null };
  }
};

// Check if user has premium access (backwards compatibility)
export const checkPremium = async () => {
  const { tier } = await checkUserPlan();
  return tier === "pro";
};

// Check business plan tier
export const checkBusinessPlan = async (businessId) => {
  try {
    if (!businessId) return { tier: "free", plan: null };

    const sub = await apiRequest(`/api/subscription/business/${businessId}`);
    return {
      tier: (sub?.tier || "free").toLowerCase(),
      plan: sub?.plan || null,
    };
  } catch {
    return { tier: "free", plan: null };
  }
};

// User features by tier
export const USER_FEATURES = {
  FREE: {
    COMPARE_PRICES: true,
    VIEW_DISTANCE: true,
    CREATE_LISTS: true,
    SAVE_COMPARISONS: true,
    HISTORY_LIMITED: true,
    BASIC_FEATURES: true,
    ITEM_COMPARISON: false,
    FULL_HISTORY: false,
    UNLIMITED_ALERTS: false,
    UNLIMITED_FAVORITES: false,
    ADVANCED_FILTERS: false,
    HOTEL_FULL_FEATURES: false,
  },
  PRO: {
    COMPARE_PRICES: true,
    VIEW_DISTANCE: true,
    CREATE_LISTS: true,
    SAVE_COMPARISONS: true,
    HISTORY_LIMITED: false,
    BASIC_FEATURES: true,
    ITEM_COMPARISON: true,
    FULL_HISTORY: true,
    UNLIMITED_ALERTS: true,
    UNLIMITED_FAVORITES: true,
    ADVANCED_FILTERS: true,
    HOTEL_FULL_FEATURES: true,
  },
};

// Business features by tier
export const BUSINESS_FEATURES = {
  FREE: {
    PUBLIC_PROFILE: true,
    ADDRESS_HOURS_ROUTE: true,
    BASIC_LISTING: true,
    EDIT_PRICES: false,
    SPONSORED_HIGHLIGHT: false,
    BASIC_STATS: false,
    FULL_REPORTS: false,
    PRODUCT_SPONSORSHIP: false,
  },
  PRO: {
    PUBLIC_PROFILE: true,
    ADDRESS_HOURS_ROUTE: true,
    BASIC_LISTING: true,
    EDIT_PRICES: true,
    SPONSORED_HIGHLIGHT: false,
    BASIC_STATS: true,
    FULL_REPORTS: false,
    PRODUCT_SPONSORSHIP: false,
  },
  PREMIUM: {
    PUBLIC_PROFILE: true,
    ADDRESS_HOURS_ROUTE: true,
    BASIC_LISTING: true,
    EDIT_PRICES: true,
    SPONSORED_HIGHLIGHT: true,
    BASIC_STATS: true,
    FULL_REPORTS: true,
    PRODUCT_SPONSORSHIP: true,
  },
};

// Free tier limits
export const FREE_LIMITS = {
  HISTORY_DAYS: 30,
  MAX_ALERTS: 1,
  SAVED_LISTS: 3,
  COMPARISONS_PER_MONTH: 10,
};
