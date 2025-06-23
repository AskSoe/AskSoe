import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-context';
import { getUserPlan } from '@/lib/userPlanUtils';
import { SubscriptionTier, type SubscriptionTierType } from "@/shared/schema";
import { useAuthDialogProvider } from "@/components/auth/auth-provider";

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
  showText?: boolean;
}

export function UpgradeButton({
  className = '',
  variant = 'default',
  size = 'default',
  showText = true,
}: UpgradeButtonProps) {
  const { openAuthDialog } = useAuthDialogProvider();
  const { isAuthenticated } = useAuth();
  
  // Get the user's current subscription tier from auth context
  // We'll assume 'free' if we don't have the information
  const userTierString = SubscriptionTier.FREE as SubscriptionTierType;
  const plan = getUserPlan(userTierString);
  
  // Don't show upgrade button for enterprise users
  if (userTierString === SubscriptionTier.ENTERPRISE as SubscriptionTierType) {
    return null;
  }
  
  // Determine the target upgrade tier
  const targetTier = userTierString === (SubscriptionTier.FREE as SubscriptionTierType)
    ? SubscriptionTier.PRO as SubscriptionTierType
    : SubscriptionTier.ENTERPRISE as SubscriptionTierType;
  
  const handleUpgrade = () => {
    if (!isAuthenticated) {
      openAuthDialog();
      return;
    }

    // TODO: Implement upgrade logic
    console.log(`Upgrading to ${targetTier}`);
  };

  return (
    <Button
      onClick={handleUpgrade}
      className={className}
      variant={variant}
      size={size}
    >
      <Zap className="mr-2 h-4 w-4" />
      {showText && (
        <span>
          {userTierString === (SubscriptionTier.FREE as SubscriptionTierType) ? 'Upgrade to Pro' : 'Upgrade to Enterprise'}
        </span>
      )}
    </Button>
  );
}