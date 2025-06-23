import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { canAccessFeature, formatPrice, getUserPlan } from '@/lib/userPlanUtils';
import { SubscriptionTier, type SubscriptionTierType } from "@/shared/schema";

interface SubscriptionPlanCardProps {
  tier: SubscriptionTierType;
  currentTier: SubscriptionTierType;
  onSelect: (tier: SubscriptionTierType) => void;
  disabled?: boolean;
}

export function SubscriptionPlanCard({ 
  tier, 
  currentTier, 
  onSelect, 
  disabled = false 
}: SubscriptionPlanCardProps) {
  const plan = getUserPlan(tier);
  const isCurrentPlan = tier === currentTier;
  
  // Features for this tier
  const features = [
    {
      name: 'System Integrations',
      value: plan.maxSystems === 1 ? '1 system' : `Up to ${plan.maxSystems} systems`,
      available: true,
    },
    {
      name: 'Write Access',
      value: 'Create and modify records',
      available: plan.canWrite,
    },
    {
      name: 'Query Limit',
      value: plan.isUnlimitedQueries ? 'Unlimited' : `${plan.maxQueries}/month`,
      available: true,
    },
    {
      name: 'Advanced Analytics',
      value: 'Custom reports and visualizations',
      available: canAccessFeature(tier, 'advancedAnalytics'),
    },
    {
      name: 'Custom Integrations',
      value: 'Connect to any system',
      available: canAccessFeature(tier, 'customIntegrations'),
    },
  ];

  return (
    <Card className={`w-full ${isCurrentPlan ? 'border-primary' : ''} relative`}>
      {isCurrentPlan && (
        <Badge className="absolute top-4 right-4 bg-primary">
          Current Plan
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{plan.displayName}</span>
        </CardTitle>
        <CardDescription>
          {plan.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">
          {formatPrice(plan.price)}
        </div>
        
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              {feature.available ? (
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-medium">{feature.name}</div>
                <div className={`text-sm ${!feature.available ? 'text-muted-foreground' : ''}`}>
                  {feature.value}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          variant={isCurrentPlan ? "outline" : "default"}
          onClick={() => onSelect(tier)}
          disabled={disabled || isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : tier === SubscriptionTier.FREE ? 'Downgrade' : 'Upgrade'}
        </Button>
      </CardFooter>
    </Card>
  );
}