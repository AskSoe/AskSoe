import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserMessage, AssistantMessage } from "./message";
import { TypingIndicator } from "./typing-indicator";
import { DatabaseIcon, GlobeIcon, WrenchIcon } from "lucide-react";
import { webSocketClient } from "@/lib/websocket";
import { motion, AnimatePresence } from "framer-motion";
import { type Message } from '@shared/schema';

interface BasicThreadProps {
  conversationId?: number;
}

export function BasicThread({ conversationId }: BasicThreadProps) {
  // Animated system type for the welcome screen
  const systemPhrases = [
    "System of Record",
    "System of Engagement",
    "System of Intelligence",
    "System of Work",
    "System of Everything"
  ];
  
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);
  // Local state for messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | unknown | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enhanced animation for rotating phrases
  useEffect(() => {
    if (!conversationId) {
      const interval = setInterval(() => {
        setShow(false);
        setTimeout(() => {
          setIndex((prev) => (prev + 1) % systemPhrases.length);
          setShow(true);
        }, 300);
      }, 2500);
      
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  // Function to directly fetch messages
  const fetchMessages = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      
      if (!response.ok) {
        throw new Error(`Error fetching messages: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error("Error directly fetching messages:", err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount or conversation change
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [conversationId]);
  
  // Set up WebSocket listeners for message updates
  useEffect(() => {
    if (!conversationId) return;
    
    // Handle message updates coming from WebSocket
    const handleMessageUpdate = (data: any) => {
      if (data && data.conversationId === conversationId) {
        // Refresh messages from server to ensure we have the latest
        fetchMessages();
      }
    };
    
    // Handle custom refresh event from input component
    const handleRefreshEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.conversationId === conversationId) {
        fetchMessages();
      }
    };
    
    // Listen for message updates
    webSocketClient.on("message_updated", handleMessageUpdate);
    
    // Listen for our custom refresh event
    window.addEventListener('refreshMessages', handleRefreshEvent);
    
    // Connect WebSocket if not already connected
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect();
    }
    
    // Regular polling as a backup to WebSocket
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 3000);
    
    return () => {
      webSocketClient.off("message_updated", handleMessageUpdate);
      window.removeEventListener('refreshMessages', handleRefreshEvent);
      clearInterval(pollInterval);
    };
  }, [conversationId]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // No debug logs needed

  // Welcome screen when no conversation is selected
  if (!conversationId) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-6">
            SOE — <AnimatePresence mode="wait">
              {show && (
                <motion.span
                  key={systemPhrases[index]}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-blue-600 ml-2"
                >
                  {systemPhrases[index]}
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
          <p className="text-xl text-center max-w-2xl mb-8">
            One simple chat interface that connects and understands all your enterprise systems.
            Ask questions. Get insights. Take action. Just ask <span className="font-semibold">Soe</span>.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow hover:bg-blue-700 transition mb-12">
            Try Demo
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Card className="bg-primary-50 border-primary-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-primary-500 mb-2">
                  <DatabaseIcon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">Internal Data</h3>
                <p className="text-sm text-neutral-600">Access information from CRM, ERP, and visualization platforms.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-neutral-50 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-neutral-600 mb-2">
                  <GlobeIcon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">External Context</h3>
                <p className="text-sm text-neutral-600">Get general information, benchmarks, and best practices.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-accent-50 border-accent-100 shadow-sm hover:shadow-md transition-shadow">
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
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'An unknown error occurred';
      
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Messages</h3>
            <p className="text-neutral-600">{errorMessage}</p>
            <button 
              onClick={() => fetchMessages()} 
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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center text-gray-500 my-8">
            <p className="text-sm">Type your message below to get started</p>
          </div>
          <TypingIndicator conversationId={conversationId} />
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }

  // Normal state - show messages
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* List messages */}
        {messages.map((message: Message) => (
          message.role === "user" ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AssistantMessage key={message.id} message={message} />
          )
        ))}
        
        {/* Show typing indicator */}
        <TypingIndicator conversationId={conversationId} />
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}