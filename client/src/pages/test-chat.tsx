import SoeChat from "@/components/chat/SoeChat";
import { useAuth } from "@/hooks/use-auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function TestChat() {
  const { isAuthenticated, isLoading } = useAuth();
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Direct OpenAI Chat Test</h1>
      
      <p className="text-muted-foreground">
        This page tests the direct OpenAI integration using our new /api/ask endpoint.
        It bypasses the more complex message handling system and ensures direct communication
        with OpenAI is working properly.
      </p>
      
      {!isLoading && !isAuthenticated && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to log in to use the chat functionality.
          </AlertDescription>
        </Alert>
      )}
      
      {(isAuthenticated || isLoading) && (
        <SoeChat />
      )}
    </div>
  );
}