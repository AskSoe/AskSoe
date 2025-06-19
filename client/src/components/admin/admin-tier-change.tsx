import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getUserPlan, formatPrice } from '@/lib/userPlanUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { type User, type SubscriptionTierType, type AccessLevelType, SubscriptionTier, AccessLevel } from "@shared/schema";

interface AdminTierChangeDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Export both names for compatibility with different parts of the codebase
export function AdminTierChangeDialog({ user, open, onOpenChange }: AdminTierChangeDialogProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierType>(
    user.subscriptionTier as SubscriptionTierType || SubscriptionTier.FREE
  );
  const [selectedAccess, setSelectedAccess] = useState<AccessLevelType>(
    user.accessLevel as AccessLevelType || AccessLevel.READ
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get plans for display
  const freePlan = getUserPlan(SubscriptionTier.FREE);
  const proPlan = getUserPlan(SubscriptionTier.PRO);
  const enterprisePlan = getUserPlan(SubscriptionTier.ENTERPRISE);
  
  // Mutation to update the user's subscription tier
  const updateTierMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      tier, 
      accessLevel 
    }: { 
      userId: number; 
      tier: SubscriptionTierType; 
      accessLevel: AccessLevelType;
    }) => {
      const res = await apiRequest('PUT', `/api/users/${userId}/subscription`, { 
        tier, 
        accessLevel 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Subscription Updated',
        description: 'User subscription has been updated successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user subscription.',
        variant: 'destructive',
      });
    },
  });
  
  // Check if access level is valid for the selected tier
  const isAccessLevelValid = () => {
    // Only ENTERPRISE tier users can have WRITE access
    if (selectedAccess === AccessLevel.WRITE && selectedTier !== SubscriptionTier.ENTERPRISE) {
      return false;
    }
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!isAccessLevelValid()) {
      toast({
        title: 'Invalid Configuration',
        description: 'Write access is only available for Enterprise tier users.',
        variant: 'destructive',
      });
      return;
    }
    
    // If changing to a lower tier, check if the user has more systems than allowed
    const newPlan = getUserPlan(selectedTier);
    const systemCount = user.systemsConnected || 0;
    if (systemCount > newPlan.maxSystems) {
      const confirmDowngrade = window.confirm(
        `Warning: This user has ${systemCount} connected systems, but ${newPlan.displayName} only allows ${newPlan.maxSystems}. Continuing will require the user to disconnect some systems. Continue?`
      );
      
      if (!confirmDowngrade) {
        return;
      }
    }
    
    await updateTierMutation.mutateAsync({
      userId: user.id,
      tier: selectedTier,
      accessLevel: selectedAccess,
    });
  };
  
  // Automatically adjust access level when downgrading from Enterprise
  const handleTierChange = (tier: SubscriptionTierType) => {
    setSelectedTier(tier);
    
    // Ensure READ_WRITE is only available for ENTERPRISE
    if (tier !== SubscriptionTier.ENTERPRISE && selectedAccess === AccessLevel.WRITE) {
      setSelectedAccess(AccessLevel.READ);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            Update the subscription plan and access level for {user.username}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Subscription Tier</h3>
            <RadioGroup 
              value={selectedTier} 
              onValueChange={(value) => handleTierChange(value as SubscriptionTierType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={SubscriptionTier.FREE} id="free" />
                <Label htmlFor="free" className="flex-1">
                  <span className="font-medium">{freePlan.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {freePlan.maxSystems} system • {formatPrice(freePlan.price)}
                  </span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={SubscriptionTier.PRO} id="pro" />
                <Label htmlFor="pro" className="flex-1">
                  <span className="font-medium">{proPlan.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {proPlan.maxSystems} systems • {formatPrice(proPlan.price)}
                  </span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={SubscriptionTier.ENTERPRISE} id="enterprise" />
                <Label htmlFor="enterprise" className="flex-1">
                  <span className="font-medium">{enterprisePlan.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {enterprisePlan.maxSystems} systems • {formatPrice(enterprisePlan.price)}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Access Level</h3>
            <RadioGroup 
              value={selectedAccess} 
              onValueChange={(value) => setSelectedAccess(value as AccessLevelType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={AccessLevel.READ} id="read" />
                <Label htmlFor="read" className="flex-1">
                  <span className="font-medium">Read-Only Access</span>
                  <span className="block text-xs text-muted-foreground">
                    Can query and view data from systems
                  </span>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-2 rounded-md border p-3 ${
                selectedTier !== SubscriptionTier.ENTERPRISE ? 'opacity-50' : ''
              }`}>
                <RadioGroupItem 
                  value={AccessLevel.WRITE} 
                  id="write" 
                  disabled={selectedTier !== SubscriptionTier.ENTERPRISE} 
                />
                <Label htmlFor="write" className="flex-1">
                  <span className="font-medium">Read/Write Access</span>
                  <span className="block text-xs text-muted-foreground">
                    Can query, view, and modify data in systems
                  </span>
                </Label>
              </div>
            </RadioGroup>
            
            {selectedAccess === AccessLevel.WRITE && selectedTier !== SubscriptionTier.ENTERPRISE && (
              <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                Write access is only available for Enterprise tier users.
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={updateTierMutation.isPending || !isAccessLevelValid()}
          >
            {updateTierMutation.isPending ? 'Updating...' : 'Update Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export an alias for compatibility with components that expect AdminTierChange
export const AdminTierChange = AdminTierChangeDialog;