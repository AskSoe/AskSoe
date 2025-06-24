import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { initSalesforceOAuth, canPerformWrite } from "@/lib/authApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./use-auth-context";
import { AccessLevel, type AccessLevelType } from "@shared/schema";

/**
 * Hook for initializing Salesforce OAuth flow
 */
export function useSalesforceAuth() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accessLevel: AccessLevelType = AccessLevel.READ) => {
      toast({
        title: "Connecting to Salesforce",
        description: "You'll be redirected to login to your Salesforce account",
      });
      return initSalesforceOAuth(accessLevel);
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: "Failed to connect to Salesforce. Please try again.",
        variant: "destructive",
      });
      console.error("Salesforce auth error:", error);
    }
  });
}

/**
 * Hook to manage the authentication dialog state
 */
export function useAuthDialog() {
  const [isOpen, setIsOpen] = useState(false);
  
  const openAuthDialog = () => setIsOpen(true);
  const closeAuthDialog = () => setIsOpen(false);
  
  return {
    isOpen,
    openAuthDialog,
    closeAuthDialog,
    setIsOpen
  };
}

/**
 * Hook to check write permissions (with UI feedback)
 * Returns a function that will check permissions and show error toasts
 */
export function useWritePermission() {
  const { toast } = useToast();
  const { isAuthenticated, accessLevel } = useAuth();
  const { openAuthDialog } = useAuthDialog();
  
  const checkPermission = async (): Promise<boolean> => {
    // First check if authenticated
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect to your enterprise systems to continue.",
        variant: "destructive",
      });
      openAuthDialog();
      return false;
    }
    
    // Then check if has write permissions
    const hasWriteAccess = accessLevel === AccessLevel.WRITE;
    if (!hasWriteAccess) {
      toast({
        title: "Permission Denied",
        description: "You need write access to perform this action. Please reconnect with write permissions.",
        variant: "destructive",
      });
      openAuthDialog();
      return false;
    }
    
    return true;
  };
  
  return {
    checkPermission,
    hasWriteAccess: isAuthenticated && accessLevel === AccessLevel.WRITE
  };
}