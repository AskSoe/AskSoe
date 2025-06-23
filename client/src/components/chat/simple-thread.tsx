import { useEffect, useState } from "react";
import { UserMessage, AssistantMessage } from "@/components/chat/message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Message } from '@/shared/schema';

interface SimpleThreadProps {
  conversationId?: number;
}

export function SimpleThread({ conversationId }: SimpleThreadProps) {
  // Animation for welcome screen
  const [currentIndex, setCurrentIndex] = useState(0);
  const systemTypes = [
    "Record", "Customer", "Accounting", "Trends", "People", 
    "Marketing", "Analytics", "Logistics", "Inventory", "Engagement"
  ];
  
  // Animate text cycling for welcome screen
  useEffect(() => {
    if (!conversationId) {
      const timer = setTimeout(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === systemTypes.length - 1 ? systemTypes.length - 1 : prevIndex + 1
        );
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, conversationId]);

  // Fetch messages using React Query with more debugging
  const { 
    data: messages = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<Message[]>({
    queryKey: conversationId ? [`/api/conversations/${conversationId}/messages`] : [],
    enabled: !!conversationId,
    refetchInterval: 2000, // Poll more frequently - every 2 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // No stale time - always refetch
    retry: 3,     // Retry failed requests 3 times
    refetchOnMount: true
  });
  
  // Enhanced Debug: log conversation ID and messages when they change
  useEffect(() => {
    if (conversationId) {
      console.log(`Current conversation ID: ${conversationId}, message count: ${messages?.length}`);
      
      if (messages?.length > 0) {
        console.log("Messages for conversation:", messages);
      }
    }
  }, [conversationId, messages]);

  // Return an empty state when used in home page (no conversationId)
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center text-center py-4">
        <p className="text-gray-500 text-sm">Start typing to begin a conversation</p>
      </div>
    );
  }

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 rounded-full bg-primary-200 mb-2"></div>
          <div className="h-4 w-24 bg-primary-100 rounded mb-2"></div>
          <div className="h-3 w-32 bg-neutral-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Messages</h3>
            <p className="text-neutral-600">{String(error)}</p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-md text-sm"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - conversation selected but no messages yet
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-neutral-600">Start a conversation by typing a message below.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal state - show messages
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message: Message) => (
          message.role === "user" ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AssistantMessage key={message.id} message={message} />
          )
        ))}
        
        {/* Show typing indicator */}
        <TypingIndicator conversationId={conversationId} />
      </div>
    </div>
  );
}