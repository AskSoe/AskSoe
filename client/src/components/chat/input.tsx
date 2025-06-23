import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  SendIcon,
  InfoIcon,
  BarChart,
  FileText,
  X
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/hooks/use-chat";
import { fetchConversation } from "@/lib/api";
import { DocumentUploadDialog } from "@/components/document";
import { useConversationDocuments } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth-context";
import { useAuthDialogProvider } from "@/components/auth/auth-provider";
import { type Document } from '@/shared/schema';

interface ChatInputProps {
  conversationId?: number;
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [suggestedPrompts] = useState([
    { icon: <BarChart2 className="h-3 w-3 mr-1" />, text: "Q4 sales summary" },
    { icon: <BarChart className="h-3 w-3 mr-1" />, text: "Customer acquisition cost" },
    { icon: <InfoIcon className="h-3 w-3 mr-1" />, text: "Industry benchmarks" }
  ]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setCurrentConversation } = useChatContext();
  const { isAuthenticated } = useAuth();
  const { openAuthDialog } = useAuthDialogProvider();
  
  // Fetch conversation documents if we have a conversation ID
  const { data: documents = [] } = useConversationDocuments(conversationId);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [message]);
  
  // Effect to handle pending message after user authenticates if in a conversation
  useEffect(() => {
    if (isAuthenticated && conversationId) {
      const pendingMessage = localStorage.getItem('pendingMessage');
      if (pendingMessage) {
        // Clear the pending message first to prevent loops
        localStorage.removeItem('pendingMessage');
        
        // Set the message in the input field
        setMessage(pendingMessage);
      }
    }
  }, [isAuthenticated, conversationId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("Sending message to API:", { 
        content, 
        conversationId,
        documentIds: selectedDocuments.length > 0 ? selectedDocuments.map(doc => doc.id) : undefined
      });
      return apiRequest("POST", "/api/messages", {
        content,
        conversationId,
        documentIds: selectedDocuments.length > 0 ? selectedDocuments.map(doc => doc.id) : undefined
      });
    },
    onSuccess: async (response) => {
      console.log("Message API response:", response);
      // Check if response is already a parsed JSON object (from apiRequest)
      const data = typeof response === 'object' && response !== null && !response.json 
        ? response 
        : await response.json().catch((err: Error) => {
            console.error("Failed to parse response as JSON:", err);
            return { error: "Failed to parse response" };
          });
      console.log("Message API response data:", data);
      
      // Clear the input and selected documents
      setMessage("");
      setSelectedDocuments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Invalidate conversation messages to refresh the thread with a more reliable approach
      if (data.conversationId) {
        console.log("Message sent successfully, updating queries for conversation:", data.conversationId);
        
        // Directly trigger a refresh of our BasicThread component via a dummy event
        // This is a bit hacky but effective for debugging
        window.dispatchEvent(new CustomEvent('refreshMessages', { 
          detail: { conversationId: data.conversationId } 
        }));
        
        // Invalidate the specific conversation messages
        queryClient.invalidateQueries({
          queryKey: [`/api/conversations/${data.conversationId}/messages`],
        });
        
        // Always invalidate the conversations list to ensure it's up to date
        queryClient.invalidateQueries({
          queryKey: ['/api/conversations'],
        });
        
        // Update current conversation if it's a new one
        if (!conversationId) {
          console.log("New conversation created, fetching details");
          // Fetch the conversation details and update the current conversation
          fetchConversation(data.conversationId).then(conversation => {
            setCurrentConversation(conversation);
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store the message temporarily
      localStorage.setItem('pendingMessage', message);
      
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
    
    console.log("User is authenticated, sending message");
    sendMessageMutation.mutate(message);
  };

  const handlePromptClick = (promptText: string) => {
    setMessage(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  const handleDocumentSelect = (document: Document) => {
    const index = selectedDocuments.findIndex(doc => doc.id === document.id);
    if (index >= 0) {
      // Document already selected, remove it
      setSelectedDocuments(selectedDocuments.filter(doc => doc.id !== document.id));
    } else {
      // Add document to selection
      setSelectedDocuments([...selectedDocuments, document]);
    }
  };
  
  const handleDocumentUploadSuccess = (document: Document) => {
    // If conversation ID exists, automatically select the newly uploaded document
    if (conversationId && document.conversationId === conversationId) {
      setSelectedDocuments([...selectedDocuments, document]);
    }
    
    toast({
      title: "Document uploaded",
      description: `${document.name || ''} has been uploaded and associated with this conversation.`,
    });
  };

  return (
    <div className="bg-white border-t border-neutral-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Document attachment area */}
        {selectedDocuments.length > 0 && (
          <div className="mb-3 rounded-md border border-neutral-200 p-2 bg-neutral-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-600">Attached Documents</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setSelectedDocuments([])}
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDocuments.map((doc) => (
                <div 
                  key={doc.id || 0} 
                  className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border"
                >
                  <FileText className="h-3 w-3 text-blue-500" />
                  <span className="truncate max-w-[150px]">{doc.name || ''}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 rounded-full"
                    onClick={() => handleDocumentSelect(doc)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <form className="relative" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-neutral-300 bg-white overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <div className="px-3 py-2">
              <textarea
                ref={textareaRef}
                placeholder="Ask SOE"
                className="block w-full resize-none border-0 p-0 focus:ring-0 text-neutral-800 placeholder-neutral-400 sm:text-sm h-12"
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            
            {/* Suggested Prompts */}
            {message.length === 0 && selectedDocuments.length === 0 && (
              <div className="px-3 pb-3 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePromptClick(prompt.text)}
                  >
                    {prompt.icon}
                    {prompt.text}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Documents Quick Selection Area - shows only when conversation exists */}
            {conversationId && documents.length > 0 && message.length === 0 && selectedDocuments.length === 0 && (
              <div className="px-3 pb-3 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-neutral-600">Conversation Documents</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documents.slice(0, 3).map((doc) => (
                    <Button
                      key={doc.id || 0}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDocumentSelect(doc)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {doc.name || '' && doc.name.length > 15 ? `${doc.name.substring(0, 15)}...` : doc.name || ''}
                    </Button>
                  ))}
                  {documents.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      +{documents.length - 3} more
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="border-t border-neutral-200 px-3 py-2 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <DocumentUploadDialog 
                  conversationId={conversationId}
                  onSuccess={handleDocumentUploadSuccess}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="text-neutral-500 hover:text-neutral-700" 
                  title="Request chart"
                >
                  <BarChart className="h-5 w-5" />
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="text-xs text-neutral-500 flex items-center">
                  <InfoIcon className="h-3 w-3 mr-1" />
                  <span>Connected to 3 systems</span>
                </div>
              </div>
              <Button 
                type="submit" 
                size="sm"
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? "Sending..." : "Send"}
                {!sendMessageMutation.isPending && <SendIcon className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
