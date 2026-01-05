import { apiRequest } from "@/api/apiClient";

/**
 * Check if a business has a specific plan type
 */
export async function checkBusinessPlan(businessId) {
  try {
    // Get active subscription for this business
    const subscriptions = await base44.entities.Subscription.filter({ 
      business: businessId,
      status: 'active'
    });
    
    if (subscriptions.length === 0) {
      return { planName: 'Básico', canEditPrices: false, canSponsor: false, canViewReports: false };
    }

    const subscription = subscriptions[0];
    const plan = await base44.entities.Plan.list();
    const currentPlan = plan.find(p => p.id === subscription.plan);

    if (!currentPlan) {
      return { planName: 'Básico', canEditPrices: false, canSponsor: false, canViewReports: false };
    }

    // Define permissions based on plan name
    const planName = currentPlan.name;
    const canEditPrices = planName === 'Pro' || planName === 'Premium';
    const canSponsor = planName === 'Premium';
    const canViewReports = planName === 'Premium';

    return {
      planName,
      canEditPrices,
      canSponsor,
      canViewReports,
      plan: currentPlan,
    };
  } catch (error) {
    console.error('Error checking business plan:', error);
    return { planName: 'Básico', canEditPrices: false, canSponsor: false, canViewReports: false };
  }
}

/**
 * Business plan features
 */
export const BUSINESS_FEATURES = {
  EDIT_PRICES: 'edit_prices',
  SPONSOR: 'sponsor',
  REPORTS: 'reports',
  MULTIPLE_BRANCHES: 'multiple_branches',
};

/**
 * Check if business can use a specific feature
 */
export async function canUseFeature(businessId, feature) {
  const permissions = await checkBusinessPlan(businessId);
  
  switch (feature) {
    case BUSINESS_FEATURES.EDIT_PRICES:
      return permissions.canEditPrices;
    case BUSINESS_FEATURES.SPONSOR:
      return permissions.canSponsor;
    case BUSINESS_FEATURES.REPORTS:
      return permissions.canViewReports;
    case BUSINESS_FEATURES.MULTIPLE_BRANCHES:
      return permissions.planName === 'Premium';
    default:
      return false;
  }
}