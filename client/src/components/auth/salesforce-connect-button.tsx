import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { initSalesforceOAuth } from "@/lib/authApi";
import { Database, ExternalLink } from "lucide-react";
import { AccessLevel, type AccessLevelType } from "@/shared/schema";

interface SalesforceConnectButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  accessLevel?: AccessLevelType;
}

export function SalesforceConnectButton({ 
  className, 
  variant = "outline", 
  size = "default",
  accessLevel = AccessLevel.READ
}: SalesforceConnectButtonProps) {
  const { mutate: initAuth, isPending } = useMutation({
    mutationFn: (level: AccessLevelType) => initSalesforceOAuth(level),
    onSuccess: (data) => {
      // Redirect to Salesforce OAuth
      window.location.href = data.url;
    },
    onError: (error) => {
      console.error('Failed to initialize Salesforce OAuth:', error);
    }
  });

  const handleConnectClick = () => {
    initAuth(accessLevel);
  };

  return (
    <Button
      onClick={handleConnectClick}
      disabled={isPending}
      variant={variant}
      size={size}
      className={className}
    >
      <Database className="mr-2 h-4 w-4" />
      {isPending ? "Connecting..." : "Connect Salesforce"}
      <ExternalLink className="ml-2 h-4 w-4" />
    </Button>
  );
}