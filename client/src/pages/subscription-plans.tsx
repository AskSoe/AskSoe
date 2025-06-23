import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SubscriptionPlanCard } from '@/components/subscription/subscription-plan-card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getUserPlan } from '@/lib/userPlanUtils';
import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Crown, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { SubscriptionTier, type SubscriptionTierType } from '@/shared/schema';

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const { username, isAuthenticated, accessLevel, isLoading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get the current subscription
  const { 
    data: subscription, 
    isLoading: isLoadingSubscription
  } = useQuery({
    queryKey: ['/api/subscription/current'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/subscription/current');
        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Background fetch of subscription data failed:', error);
        return null;
      }
    },
    enabled: isAuthenticated, // Only run if user is logged in
  });
  
  // Get available plans
  const { 
    data: availablePlans, 
    isLoading: isLoadingPlans
  } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/subscription/plans');
      return res.json();
    },
  });
  
  // Handle payment setup and subscription creation
  const setupPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/subscription/create-setup-intent');
      return res.json();
    },
    onSuccess: (data) => {
      // In a real app, you would redirect to a payment form with the client secret
      console.log('Payment setup successful. Client secret:', data.clientSecret);
      toast({
        title: 'Payment Setup Ready',
        description: 'You can now proceed with plan selection.'
      });
    },
    onError: (error: Error) => {
      console.error('Error setting up payment:', error);
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Unable to set up payment method.',
        variant: 'destructive'
      });
    }
  });
  
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ paymentMethodId, planId }: { paymentMethodId: string, planId: string }) => {
      const res = await apiRequest('POST', '/api/subscription/create', {
        paymentMethodId,
        planId
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Subscription Updated',
        description: `Your subscription has been updated to ${getUserPlan(data.tier).displayName}.`
      });
      
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to create subscription.',
        variant: 'destructive'
      });
      
      setIsProcessing(false);
    }
  });
  
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/subscription/cancel');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      
      toast({
        title: 'Subscription Canceled',
        description: `Your subscription will be canceled on ${new Date(data.cancelAt).toLocaleDateString()}.`
      });
    },
    onError: (error: Error) => {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel subscription.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle plan selection
  const handleSelectPlan = async (tier: SubscriptionTierType) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to change your subscription.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // For demo purposes, we'll simulate the payment and subscription flow
      if (tier === SubscriptionTier.FREE) {
        // For downgrading to free, just cancel the current subscription
        if (subscription?.status === 'active') {
          await cancelSubscriptionMutation.mutateAsync();
        }
      } else {
        // For upgrading, in a real app, we'd:
        // 1. Setup payment intent
        // 2. Collect payment method details
        // 3. Create subscription with the payment method
        
        // Simulate these steps with a delay
        toast({
          title: 'Processing',
          description: 'Setting up your subscription...'
        });
        
        // In a real app, you would use the Stripe Elements UI to collect payment info
        // and get a paymentMethodId. For now, we'll simulate this.
        const mockPaymentMethodId = 'pm_mock_' + Date.now();
        
        // Create the subscription with our mock payment method
        await createSubscriptionMutation.mutateAsync({
          paymentMethodId: mockPaymentMethodId,
          planId: tier
        });
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      toast({
        title: 'Subscription Change Failed',
        description: 'Unable to change your subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (isLoadingSubscription || isLoadingPlans) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Get current tier from subscription or default to FREE
  const currentTier = subscription?.tier || SubscriptionTier.FREE;
  
  return (
    <div className="container max-w-6xl py-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that fits your needs. Upgrade anytime to unlock more features.
        </p>
      </div>
      
      {subscription && (
        <div className="my-6 p-4 bg-muted rounded-lg">
          <h2 className="font-semibold text-lg">Current Subscription</h2>
          <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center mt-2">
            <div>
              <p><span className="font-medium">Plan:</span> {getUserPlan(currentTier).displayName}</p>
              <p><span className="font-medium">Status:</span> {subscription.status === 'active' ? 'Active' : 'Inactive'}</p>
              {subscription.currentPeriodEnd && (
                <p><span className="font-medium">Renews:</span> {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-8 my-8">
        {/* Free Plan */}
        <SubscriptionPlanCard
          tier={SubscriptionTier.FREE}
          currentTier={currentTier}
          onSelect={handleSelectPlan}
          disabled={isProcessing}
        />
        
        {/* Pro Plan */}
        <SubscriptionPlanCard
          tier={SubscriptionTier.PRO}
          currentTier={currentTier}
          onSelect={handleSelectPlan}
          disabled={isProcessing}
        />
        
        {/* Enterprise Plan */}
        <SubscriptionPlanCard
          tier={SubscriptionTier.ENTERPRISE}
          currentTier={currentTier}
          onSelect={handleSelectPlan}
          disabled={isProcessing}
        />
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>
          All plans are billed monthly. You can cancel or change your plan at any time.
          <br />
          Enterprise plans include priority support and custom integration options.
        </p>
      </div>
    </div>
  );
}