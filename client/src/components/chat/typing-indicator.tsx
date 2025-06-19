import { useWebSocketState } from "@/components/websocket/websocket-provider";
import { useState, useEffect } from "react";

interface TypingIndicatorProps {
  conversationId?: number;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { isTyping, typingConversationId } = useWebSocketState();
  const [dots, setDots] = useState(".");
  
  // Only show typing indicator if it's for the current conversation
  const shouldShow = isTyping && 
    (conversationId === undefined || typingConversationId === conversationId);
  
  // Animate the dots
  useEffect(() => {
    if (!shouldShow) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return ".";
        if (prev === "..") return "...";
        if (prev === ".") return "..";
        return ".";
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, [shouldShow]);
  
  if (!shouldShow) return null;
  
  return (
    <div className="flex items-start gap-3 py-4 px-4">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
        <span className="text-sm">AI</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden px-1">
        <div className="group flex items-start">
          <div className="flex min-h-[20px] min-w-[60px] flex-col items-start justify-center gap-1 rounded-md bg-muted p-3 text-sm">
            <span className="text-gray-500">Thinking{dots}</span>
          </div>
        </div>
      </div>
    </div>
  );
}