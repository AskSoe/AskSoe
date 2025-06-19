import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { webSocketClient } from "@/lib/websocket";
import { WebSocketMessageType, AssistantTypingPayload } from "@/types/websocket";

interface WebSocketContextType {
  isConnected: boolean;
  isTyping: boolean;
  typingConversationId: number | null;
}

const defaultContext: WebSocketContextType = {
  isConnected: false,
  isTyping: false,
  typingConversationId: null
};

const WebSocketContext = createContext<WebSocketContextType>(defaultContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

/**
 * Provider component that gives WebSocket state to the entire app
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<number | null>(null);

  useEffect(() => {
    // Handle connection established
    const handleConnectionEstablished = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
    };

    // Handle connection closed
    const handleConnectionClosed = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
    };

    // Handle typing indicator
    const handleAssistantTyping = (payload: AssistantTypingPayload) => {
      setIsTyping(payload.isTyping);
      setTypingConversationId(payload.conversationId);
    };

    // Register event handlers
    webSocketClient.on("connection_established", handleConnectionEstablished);
    webSocketClient.on("connection_closed", handleConnectionClosed);
    webSocketClient.on("assistant_typing", handleAssistantTyping);

    // Attempt to connect if not already connected
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect();
    } else {
      setIsConnected(true);
    }

    // Clean up event handlers
    return () => {
      webSocketClient.off("connection_established", handleConnectionEstablished);
      webSocketClient.off("connection_closed", handleConnectionClosed);
      webSocketClient.off("assistant_typing", handleAssistantTyping);
    };
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected,
    isTyping,
    typingConversationId
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access WebSocket state throughout the app
 */
export function useWebSocketState() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocketState must be used within a WebSocketProvider");
  }
  return context;
}