import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { BasicThread } from "@/components/chat/basic-thread";
import { ChatInput } from "@/components/chat/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useChatContext } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MenuIcon, DatabaseIcon, GlobeIcon, BarChart2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthDialogProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth-context";
import { sendMessage } from "@/lib/api";
import { DocumentList } from "@/components/document";
import { useToast } from "@/hooks/use-toast";
import { type Conversation } from "@shared/schema";

export default function Home() {
  // Animated system type for the welcome screen - only the last word changes
  const systemPhrases = [
    "Record",
    "Engagement",
    "Intelligence",
    "Work",
    "Everything"
  ];
  
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);
  
  // State for sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // State for tracking which system has been selected by the user
  const [selectedSystem, setSelectedSystem] = useState<"internal" | "external" | "both">("both"); // Default to "both"
  // State to track if home page chat is active
  const [homePageChatActive, setHomePageChatActive] = useState(true);
  // Reference to input field for autofocus
  const inputRef = useRef<HTMLInputElement>(null);
  // Get auth dialog state and auth status
  const { isOpen, setIsOpen, openAuthDialog } = useAuthDialogProvider();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Fetch conversations with more frequent refetching
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000, // Refetch more frequently (every 5 seconds)
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale, so it will always refetch
  });
  
  const { currentConversation, setCurrentConversation } = useChatContext();

  // Mutation for creating a new conversation
  const createConversationMutation = useMutation<Conversation, Error, string>({
    mutationFn: async (title: string) => {
      return apiRequest<Conversation>("POST", "/api/conversations", { title });
    },
    onSuccess: (data: Conversation) => {
      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      // Set the newly created conversation as current
      setCurrentConversation(data);
      // Deactivate home page chat since we now have a conversation
      setHomePageChatActive(false);
    }
  });

  // Create a new conversation based on selected system
  const handleSystemSelect = (systemType: "internal" | "external" | "both") => {
    setSelectedSystem(systemType);
    
    let title = "";
    let promptPrefix = "";
    
    switch(systemType) {
      case "internal":
        title = "Internal System Query";
        promptPrefix = "Please search connected internal systems for: ";
        break;
      case "external":
        title = "External Knowledge Query";
        promptPrefix = "Please answer using your general knowledge: ";
        break;
      case "both":
        title = "Combined Knowledge Query";
        promptPrefix = "Please analyze our internal data and compare with industry benchmarks: ";
        break;
    }
    
    createConversationMutation.mutate(title);
  };

  // No longer auto-selecting first conversation to allow viewing the welcome screen
  useEffect(() => {
    // We'll simply track conversations without auto-selecting
  }, [conversations]);

  // Auto-focus the input field when component mounts
  useEffect(() => {
    // Short timeout to ensure the DOM is fully loaded
    const timer = setTimeout(() => {
      if (inputRef.current && !currentConversation) {
        inputRef.current.focus();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentConversation]);

  // Animation effect for cycling through system phrases with smoother transitions
  useEffect(() => {
    // Set a timer to cycle through the phrases
    const timer = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % systemPhrases.length);
        setShow(true);
      }, 800); // Longer fade out time before changing the phrase
    }, 4000); // Longer display time for each phrase (4 seconds)
    
    return () => clearInterval(timer);
  }, []);
  
  // Add effect to handle sending a message after conversation is created
  useEffect(() => {
    // If we have a current conversation and a pending message, send it
    const pendingMessage = localStorage.getItem('pendingMessage');
    if (currentConversation && pendingMessage) {
      // Clear the pending message first to prevent loops
      localStorage.removeItem('pendingMessage');

      // Small delay to ensure conversation is fully created
      setTimeout(() => {
        // Use the imported sendMessage function
        sendMessage(
          pendingMessage,
          currentConversation.id
        ).then(() => {
          // Message sent successfully
          console.log('Message sent via home page input');
        }).catch(error => {
          console.error('Error sending message:', error);
        });
      }, 100);
    }
  }, [currentConversation]);
  
  // Effect to handle pending message after user authenticates
  useEffect(() => {
    const pendingMessage = localStorage.getItem('pendingMessage');
    
    // If user just authenticated and there's a pending message, create a conversation
    if (isAuthenticated && pendingMessage && !currentConversation) {
      let title = "";
      switch(selectedSystem) {
        case "internal": title = "Internal System Query"; break;
        case "external": title = "External Knowledge Query"; break;
        case "both": title = "Combined Knowledge Query"; break;
      }
      
      // Create a conversation with the pending message
      createConversationMutation.mutate(title);
      // The other useEffect will handle sending the message once conversation is created
    }
  }, [isAuthenticated, createConversationMutation, currentConversation, selectedSystem]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left Sidebar - Collapsible */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block md:flex-shrink-0`}>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onConversationSelect={setCurrentConversation}
          onNewConversation={() => createConversationMutation.mutate("New Conversation")}
          providers={[]}
          activeProvider={undefined}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={currentConversation?.title || "SOE — System of Everything"} 
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        
        {/* Chat Container or Welcome Screen */}
        {currentConversation ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b px-2 bg-card">
                <TabsList className="h-10 bg-secondary">
                  <TabsTrigger value="chat" className="data-[state=active]:bg-card data-[state=active]:text-card-foreground">
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="data-[state=active]:bg-card data-[state=active]:text-card-foreground">
                    Documents
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden p-0 m-0 data-[state=active]:flex">
                <BasicThread conversationId={currentConversation?.id} />
                <ChatInput conversationId={currentConversation?.id} />
              </TabsContent>
              
              <TabsContent value="documents" className="flex-1 overflow-y-auto p-4 m-0 data-[state=active]:block">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-4 flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Conversation Documents</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Upload and manage documents related to this conversation. Documents can be referenced in your chat.
                  </p>
                  <DocumentList conversationId={currentConversation?.id} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden bg-background">
            <div className="flex-1 overflow-y-auto dashboard-content">
              <div className="flex flex-col items-center">
                {/* Simplified animation with flex layout */}
                <h1 className="text-4xl md:text-5xl outfit-bold text-center mb-6 flex justify-center items-center">
                  <span className="text-foreground mr-3">SOE — System of</span>
                  
                  {/* Container for the animated word with fixed width */}
                  <div className="inline-block min-w-[180px] text-left">
                    <AnimatePresence mode="wait">
                      {show && (
                        <motion.span
                          key={systemPhrases[index]}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                          className="text-primary"
                        >
                          {systemPhrases[index]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </h1>
                
                <motion.p 
                  className="text-lg text-center text-muted-foreground mb-8 max-w-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Ask questions using our universal system integration
                </motion.p>
                
                {/* Just chat input with system type selection */}
                <motion.div 
                  className="w-full max-w-4xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  {/* System type selection buttons */}
                  <div className="flex justify-center space-x-3 mb-3">
                    <Button
                      size="sm"
                      variant={selectedSystem === "internal" ? "default" : "outline"}
                      onClick={() => setSelectedSystem("internal")}
                      className="btn-modern flex items-center"
                    >
                      <DatabaseIcon className="h-4 w-4 mr-1" />
                      Internal
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSystem === "external" ? "default" : "outline"}
                      onClick={() => setSelectedSystem("external")}
                      className="btn-modern flex items-center"
                    >
                      <GlobeIcon className="h-4 w-4 mr-1" />
                      External
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSystem === "both" ? "default" : "outline"}
                      onClick={() => setSelectedSystem("both")}
                      className="btn-modern flex items-center"
                    >
                      <BarChart2 className="h-4 w-4 mr-1" />
                      Both
                    </Button>
                  </div>
                  
                  <div className="card-modern p-4">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder={`Ask SOE`}
                        className="input-modern flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            const inputValue = e.currentTarget.value.trim();
                            
                            // Check if user is authenticated
                            if (!isAuthenticated) {
                              // Store the message temporarily
                              localStorage.setItem('pendingMessage', inputValue);
                              
                              // Open auth dialog
                              openAuthDialog();
                              
                              // Show toast message
                              toast({
                                title: "Login Required",
                                description: "Please log in to use SOE.",
                                variant: "default"
                              });
                              
                              return;
                            }
                            
                            // Clear the input
                            e.currentTarget.value = '';
                            
                            // Auto-create conversation with user's message
                            let title = "";
                            switch(selectedSystem) {
                              case "internal": title = "Internal System Query"; break;
                              case "external": title = "External Knowledge Query"; break;
                              case "both": title = "Combined Knowledge Query"; break;
                            }
                            
                            // First create conversation
                            createConversationMutation.mutate(title);
                            
                            // After conversation is created, send message will happen in useEffect below
                            localStorage.setItem('pendingMessage', inputValue);
                          }
                        }}
                      />
                      <Button onClick={() => {
                        const inputValue = inputRef.current?.value.trim();
                        if (inputValue) {
                          // Check if user is authenticated
                          if (!isAuthenticated) {
                            // Store the message temporarily
                            localStorage.setItem('pendingMessage', inputValue);
                            
                            // Open auth dialog
                            openAuthDialog();
                            
                            // Show toast message
                            toast({
                              title: "Login Required",
                              description: "Please log in to use SOE.",
                              variant: "default"
                            });
                            
                            return;
                          }
                          
                          // Clear the input
                          if (inputRef.current) inputRef.current.value = '';
                          
                          // Auto-create conversation with user's message
                          let title = "";
                          switch(selectedSystem) {
                            case "internal": title = "Internal System Query"; break;
                            case "external": title = "External Knowledge Query"; break;
                            case "both": title = "Combined Knowledge Query"; break;
                          }
                          
                          // First create conversation
                          createConversationMutation.mutate(title);
                          
                          // After conversation is created, send message will happen in useEffect below
                          localStorage.setItem('pendingMessage', inputValue);
                        }
                      }}>
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
