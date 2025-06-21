import { type SubscriptionTierType, SubscriptionTier, tierLimits, AccessLevel } from '../../shared/schema';

export interface UserPlanInfo {
  tier: SubscriptionTierType;
  maxSystems: number;
  canWrite: boolean;
  description: string;
  price: number;
  maxQueries: number;
  isUnlimitedQueries: boolean;
  displayName: string;
  badge: {
    label: string;
    color: string;
  };
}

// Additional display information for plans
const planDisplayInfo = {
  [SubscriptionTier.FREE]: {
    displayName: 'Free',
    badge: {
      label: 'Free',
      color: 'bg-gray-500',
    },
  },
  [SubscriptionTier.PRO]: {
    displayName: 'Pro',
    badge: {
      label: 'Pro',
      color: 'bg-blue-500',
    },
  },
  [SubscriptionTier.ENTERPRISE]: {
    displayName: 'Enterprise',
    badge: {
      label: 'Enterprise',
      color: 'bg-purple-600',
    },
  },
};

/**
 * Gets detailed plan information for a user based on their subscription tier
 */
export function getUserPlan(tier: SubscriptionTierType = SubscriptionTier.FREE): UserPlanInfo {
  const limits = tierLimits[tier];
  const display = planDisplayInfo[tier];
  
  return {
    tier,
    ...limits,
    isUnlimitedQueries: limits.maxQueries === -1,
    ...display,
  };
}

/**
 * Determines if a user can access a specific feature based on their plan
 */
export function canAccessFeature(
  userTier: SubscriptionTierType,
  feature: 'multiSystem' | 'write' | 'unlimitedQueries' | 'advancedAnalytics' | 'customIntegrations'
): boolean {
  const plan = getUserPlan(userTier);
  
  switch (feature) {
    case 'multiSystem':
      return plan.maxSystems > 1;
    case 'write':
      return plan.canWrite;
    case 'unlimitedQueries':
      return plan.isUnlimitedQueries;
    case 'advancedAnalytics':
      // Advanced analytics available on Pro and Enterprise plans
      return userTier === SubscriptionTier.PRO || userTier === SubscriptionTier.ENTERPRISE;
    case 'customIntegrations':
      // Custom integrations only available on Enterprise plan
      return userTier === SubscriptionTier.ENTERPRISE;
    default:
      return false;
  }
}

/**
 * Get appropriate access level based on subscription tier
 */
export function getAccessLevelForTier(tier: SubscriptionTierType): typeof AccessLevel.READ | typeof AccessLevel.WRITE {
  const plan = getUserPlan(tier);
  return plan.canWrite ? AccessLevel.WRITE : AccessLevel.READ;
}

/**
 * Format currency for display
 */
export function formatPrice(price: number): string {
  return price === 0 
    ? 'Free' 
    : `$${price.toFixed(2)}/month`;
}

/**
 * Get upgrade URL for stripe checkout
 */
export function getUpgradeUrl(currentTier: SubscriptionTierType, targetTier: SubscriptionTierType): string {
  // This would normally construct a URL to your Stripe checkout page
  // with the appropriate price ID for the tier
  return `/billing/upgrade?from=${currentTier}&to=${targetTier}`;
}