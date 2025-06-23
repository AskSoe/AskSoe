import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserMessage, AssistantMessage } from "@/components/chat/message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { DatabaseIcon, GlobeIcon, WrenchIcon } from "lucide-react";
import { webSocketClient } from "@/lib/websocket";
import { type Message } from '@/shared/schema';

interface ChatThreadProps {
  conversationId?: number;
}

export function ChatThread({ conversationId }: ChatThreadProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Regular React Query for messages
  const { 
    data: queryMessages = [], 
    isLoading: queryLoading,
    isError: queryError,
    error: queryErrorObj,
    refetch
  } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    // Only fetch if we have a conversation ID
    enabled: !!conversationId,
    // Refetch when the conversationId changes
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  
  // Combined messages from both sources (local state and query)
  const messages = localMessages.length > 0 ? localMessages : queryMessages;
  const isLoading = loading || queryLoading;
  const isError = !!loadError || queryError;
  const error = loadError || queryErrorObj;
  
  // Directly fetch messages when conversation ID changes
  useEffect(() => {
    if (!conversationId) return;
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Direct fetch for conversation ${conversationId} returned ${data.length} messages`);
        setLocalMessages(data);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setLoadError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
    // Also trigger a query refetch
    refetch();
  }, [conversationId, refetch]);
  
  // For debugging - output current conversation ID and message count
  useEffect(() => {
    if (conversationId) {
      console.log(`ChatThread: conversationId=${conversationId}, message count=${messages.length}`);
      
      // If there are no messages, try refetching
      if (messages.length === 0 && !isLoading) {
        console.log("No messages found, triggering refetch");
        refetch();
      }
    }
  }, [conversationId, messages.length, isLoading, refetch]);
  
  // WebSocket handler for real-time message updates
  useEffect(() => {
    if (!conversationId) return;
    
    const handleMessageUpdate = (data: any) => {
      // Only process updates for the current conversation
      if (data.conversationId === conversationId) {
        console.log("Received WebSocket message update:", data);
        
        // Update the local message if it exists
        setLocalMessages(prevMessages => {
          const messageIndex = prevMessages.findIndex(m => m.id === data.messageId);
          
          if (messageIndex >= 0) {
            // Create a new array with the updated message
            const updatedMessages = [...prevMessages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              content: data.content,
              systemSources: data.systemSources || updatedMessages[messageIndex].systemSources
            };
            return updatedMessages;
          }
          
          // If message doesn't exist yet, refetch all messages
          refetch();
          return prevMessages;
        });
      }
    };
    
    const handleNewMessage = (data: any) => {
      // Only process updates for the current conversation
      if (data.conversationId === conversationId) {
        console.log("Received new message:", data);
        // Force refetch to get the complete message
        refetch();
      }
    };
    
    // Register WebSocket handlers
    webSocketClient.on('message_updated', handleMessageUpdate);
    webSocketClient.on('new_message', handleNewMessage);
    
    // Cleanup function
    return () => {
      webSocketClient.off('message_updated', handleMessageUpdate);
      webSocketClient.off('new_message', handleNewMessage);
    };
  }, [conversationId, refetch]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Welcome message when no conversation is selected or no messages exist
  if (!conversationId || messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white chat-height">
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-xl font-semibold text-center">Welcome to the AI Integration Hub</h2>
          <p className="text-neutral-600 text-center mt-2 mb-4">Your universal interface to all connected enterprise systems</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-primary-50 border-primary-100">
              <CardContent className="p-4">
                <div className="text-primary-500 mb-2">
                  <DatabaseIcon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">Internal Data</h3>
                <p className="text-sm text-neutral-600">Access information from CRM, ERP, and visualization platforms.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-neutral-50 border-neutral-200">
              <CardContent className="p-4">
                <div className="text-neutral-600 mb-2">
                  <GlobeIcon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">External Context</h3>
                <p className="text-sm text-neutral-600">Get general information, benchmarks, and best practices.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-accent-50 border-accent-100">
              <CardContent className="p-4">
                <div className="text-accent-500 mb-2">
                  <WrenchIcon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">Cross-System Analysis</h3>
                <p className="text-sm text-neutral-600">Draw insights that span multiple platforms.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
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
  
  if (isError) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Messages</h3>
            <p className="text-neutral-600">{error instanceof Error ? error.message : "An unknown error occurred"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div
      ref={threadRef} 
      className="flex-1 overflow-y-auto p-4 md:p-6 bg-white chat-height"
    >
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
