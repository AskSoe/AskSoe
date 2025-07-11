import { useEffect } from "react";
import { webSocketClient } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

/**
 * This component manages the WebSocket connection
 * It should be mounted once at the application root level
 */
export function WebSocketConnectionManager() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Handle successful connection
    const handleConnectionSuccess = (data: any) => {
      toast({
        title: "Connected to AI Hub",
        description: `Real-time updates enabled.`,
        variant: "default",
      });
    };
    
    // Handle connection errors
    const handleConnectionError = (data: any) => {
      toast({
        title: "Connection Error",
        description: `Could not connect to AI Hub: ${data.error}`,
        variant: "destructive",
      });
    };
    
    // Handle connection closed
    const handleConnectionClosed = (data: any) => {
      // Do nothing (removed toast for connection lost)
    };
    
    // Register event handlers
    webSocketClient.on("connection_success", handleConnectionSuccess);
    webSocketClient.on("connection_error", handleConnectionError);
    webSocketClient.on("connection_closed", handleConnectionClosed);
    
    // Connect to WebSocket server if not already connected
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect();
    }
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (webSocketClient.isConnected()) {
        webSocketClient.send("ping", { timestamp: Date.now() });
      }
    }, 30000); // Send ping every 30 seconds
    
    // Clean up event handlers and intervals
    return () => {
      webSocketClient.off("connection_success", handleConnectionSuccess);
      webSocketClient.off("connection_error", handleConnectionError);
      webSocketClient.off("connection_closed", handleConnectionClosed);
      clearInterval(pingInterval);
    };
  }, [toast]);
  
  // This component doesn't render anything
  return null;
}