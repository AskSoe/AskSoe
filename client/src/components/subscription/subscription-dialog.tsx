import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  maxSystems: number;
  canWrite: boolean;
  price?: number;
  features?: string[];
}

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  user: any; // Replace with your user type
}

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLIC_KEY);

// Payment form component
function SubscriptionPaymentForm({ planId, onSuccess, onCancel }: { planId: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    // Get payment method
    const { error: submitError, paymentMethod } = await stripe.createPaymentMethod({
      elements,
      params: { type: 'card' } 
    });

    if (submitError) {
      setPaymentError(submitError.message || "An error occurred with your payment");
      setIsProcessing(false);
      return;
    }

    // Now create the subscription with the payment method
    try {
      const response = await apiRequest("POST", "/api/subscription/create", {
        paymentMethodId: paymentMethod.id,
        planId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create subscription");
      }

      // Success!
      toast({
        title: "Subscription successful!",
        description: "Your account has been upgraded.",
      });

      // Invalidate user data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
      
      setIsProcessing(false);
      onSuccess();
    } catch (error: any) {
      setPaymentError(error.message || "An error occurred processing your subscription");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {paymentError && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{paymentError}</p>
        </div>
      )}
      
      <div className="flex justify-between mt-4 gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Subscribe Now"
          )}
        </Button>
      </div>
    </form>
  );
}

// Plan cards component
function PlanCards({ plans, selectedPlan, onSelectPlan, currentTier }: { 
  plans: Plan[]; 
  selectedPlan: string | null; 
  onSelectPlan: (planId: string) => void;
  currentTier: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={`
          ${selectedPlan === plan.id ? 'border-primary' : ''}
          ${currentTier === plan.id ? 'bg-muted/50' : ''}
          cursor-pointer transition-all
        `} onClick={() => onSelectPlan(plan.id)}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{plan.name}</CardTitle>
              {currentTier === plan.id && <Badge>Current</Badge>}
            </div>
            {plan.price ? (
              <CardDescription>${plan.price}/month</CardDescription>
            ) : (
              <CardDescription>Free</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Up to {plan.maxSystems} system connections</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{plan.canWrite ? "Read & Write access" : "Read-only access"}</span>
              </li>
              {plan.features?.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant={selectedPlan === plan.id ? "default" : "outline"}
              disabled={currentTier === plan.id}
              onClick={() => onSelectPlan(plan.id)}
            >
              {currentTier === plan.id ? "Current Plan" : "Select Plan"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Main subscription dialog component
export function SubscriptionDialog({ open, onClose, user }: SubscriptionDialogProps) {
  const [step, setStep] = useState<"plans" | "payment" | "success">("plans");
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load plans on mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        
        // Use hardcoded plans if API fails
        const formattedPlans: Plan[] = [
          {
            id: "free",
            name: "Free Tier",
            maxSystems: 1,
            canWrite: false,
            features: ["1 system connection", "Read-only access", "Basic support", "Standard response times"]
          },
          {
            id: "pro",
            name: "Pro Tier",
            maxSystems: 5,
            canWrite: false,
            price: 19.99,
            features: ["5 system connections", "Read-only access", "Priority support", "Advanced analytics", "Custom branding"]
          },
          {
            id: "enterprise",
            name: "Enterprise Tier",
            maxSystems: 10,
            canWrite: true,
            price: 49.99,
            features: ["10 system connections", "Read & Write access", "Dedicated support", "Advanced customization", "Custom integrations", "SLA guarantees"]
          }
        ];
        
        setPlans(formattedPlans);
        
        // Set current subscription info based on user data
        setCurrentSubscription({
          tier: user.subscriptionTier || "free",
          status: "active"
        });
        
        setIsLoading(false);
        
        // Still try to fetch from API in the background
        try {
          const plansResponse = await apiRequest("GET", "/api/subscription/plans");
          const plansData = await plansResponse.json();
          
          // If API fetch was successful, update with API data
          if (plansData && plansData.free) {
            const apiFormattedPlans: Plan[] = [
              {
                id: "free",
                name: plansData.free.name,
                maxSystems: plansData.free.maxSystems,
                canWrite: plansData.free.canWrite,
                features: ["Basic support", "Standard response times"]
              },
              {
                id: "pro",
                name: plansData.pro.name,
                maxSystems: plansData.pro.maxSystems,
                canWrite: plansData.pro.canWrite,
                price: 19.99,
                features: ["Priority support", "Advanced analytics", "Custom branding"]
              },
              {
                id: "enterprise",
                name: plansData.enterprise.name,
                maxSystems: plansData.enterprise.maxSystems,
                canWrite: plansData.enterprise.canWrite,
                price: 49.99,
                features: ["Dedicated support", "Advanced customization", "Custom integrations", "SLA guarantees"]
              }
            ];
            
            setPlans(apiFormattedPlans);
          }
          
          // Try to load current subscription data
          const subscriptionResponse = await apiRequest("GET", "/api/subscription/current");
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            setCurrentSubscription(subscriptionData);
          }
        } catch (error) {
          console.error("Background fetch of subscription data failed:", error);
          // Don't show a toast since we already have the fallback data displayed
        }
      } catch (error) {
        console.error("Error loading subscription data:", error);
        toast({
          title: "Failed to load subscription options",
          description: "Using default plan information",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };
    
    if (open) {
      loadPlans();
    }
  }, [open, toast, user]);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") {
      // For free plan, no payment needed
      try {
        await apiRequest("POST", "/api/subscription/cancel");
        toast({
          title: "Plan updated",
          description: "Your subscription has been canceled and you've been moved to the free tier.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/current"] });
        onClose();
      } catch (error) {
        toast({
          title: "Failed to update plan",
          description: "An error occurred while canceling your subscription",
          variant: "destructive",
        });
      }
      return;
    }
    
    setSelectedPlan(planId);
    
    try {
      // Create a SetupIntent to collect payment method
      const response = await apiRequest("POST", "/api/subscription/create-setup-intent");
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "Unable to setup payment processing",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = () => {
    setStep("success");
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleCancel = () => {
    setStep("plans");
    setSelectedPlan(null);
    setClientSecret(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Subscription Plans</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your needs. Upgrade anytime to unlock more features.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading subscription options...</p>
          </div>
        ) : step === "plans" && plans ? (
          <PlanCards 
            plans={plans} 
            selectedPlan={selectedPlan} 
            onSelectPlan={handleSelectPlan} 
            currentTier={currentSubscription?.tier || "free"} 
          />
        ) : step === "payment" && clientSecret ? (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">Payment Information</h3>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscriptionPaymentForm 
                planId={selectedPlan!} 
                onSuccess={handlePaymentSuccess} 
                onCancel={handleCancel} 
              />
            </Elements>
          </div>
        ) : step === "success" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-medium mb-2">Subscription Updated!</h3>
            <p className="text-center text-muted-foreground">
              Your account has been successfully upgraded. Enjoy your new features!
            </p>
          </div>
        ) : null}
        
        <DialogFooter>
          {step === "plans" && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}