import { type User, type SubscriptionTierType, tierLimits, SubscriptionTier } from "../../shared/schema";
import { storage } from "../storage";

export interface SubscriptionService {
  getCurrentSubscription(userId: number): Promise<{
    tier: SubscriptionTierType;
    limits: typeof tierLimits[SubscriptionTierType];
    systemsConnected: number;
    queryCount: number;
  } | undefined>;
  getAvailablePlans(): Promise<Array<{
    tier: SubscriptionTierType;
    displayName: string;
    badge: { label: string; color: string };
  } & typeof tierLimits[SubscriptionTierType]>>;
  upgradeSubscription(userId: number, newTier: SubscriptionTierType): Promise<User | undefined>;
  canAccessFeature(userId: number, feature: 'multiSystem' | 'write' | 'unlimitedQueries'): Promise<boolean>;
  incrementQueryCount(userId: number): Promise<User | undefined>;
}

export class SubscriptionServiceImpl implements SubscriptionService {
  async getCurrentSubscription(userId: number): Promise<{
    tier: SubscriptionTierType;
    limits: typeof tierLimits[SubscriptionTierType];
    systemsConnected: number;
    queryCount: number;
  } | undefined> {
    const user = await storage.getUser(userId);
    if (!user) return undefined;

    const tier = (user.subscriptionTier as SubscriptionTierType) || SubscriptionTier.FREE;
    
    return {
      tier,
      limits: tierLimits[tier],
      systemsConnected: user.systemsConnected || 0,
      queryCount: user.queryCount || 0,
    };
  }

  async getAvailablePlans(): Promise<Array<{
    tier: SubscriptionTierType;
    displayName: string;
    badge: { label: string; color: string };
  } & typeof tierLimits[SubscriptionTierType]>> {
    return [
      {
        tier: SubscriptionTier.FREE,
        ...tierLimits[SubscriptionTier.FREE],
        displayName: "Free",
        badge: {
          label: "Free",
          color: "bg-gray-500",
        },
      },
      {
        tier: SubscriptionTier.PRO,
        ...tierLimits[SubscriptionTier.PRO],
        displayName: "Pro",
        badge: {
          label: "Pro",
          color: "bg-blue-500",
        },
      },
      {
        tier: SubscriptionTier.ENTERPRISE,
        ...tierLimits[SubscriptionTier.ENTERPRISE],
        displayName: "Enterprise",
        badge: {
          label: "Enterprise",
          color: "bg-purple-600",
        },
      },
    ];
  }

  async upgradeSubscription(userId: number, newTier: SubscriptionTierType): Promise<User | undefined> {
    return await storage.updateUserSubscription(userId, newTier);
  }

  async canAccessFeature(userId: number, feature: 'multiSystem' | 'write' | 'unlimitedQueries'): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return false;

    switch (feature) {
      case 'multiSystem':
        return subscription.limits.maxSystems > 1;
      case 'write':
        return subscription.limits.canWrite;
      case 'unlimitedQueries':
        return subscription.limits.maxQueries === -1;
      default:
        return false;
    }
  }

  async incrementQueryCount(userId: number): Promise<User | undefined> {
    return await storage.incrementUserQueryCount(userId);
  }
}

export const subscriptionService = new SubscriptionServiceImpl(); 