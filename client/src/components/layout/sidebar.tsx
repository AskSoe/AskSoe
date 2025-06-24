import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Settings,
  ChevronRight,
  PlusIcon,
  UserIcon,
  XIcon
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ConnectionItem } from "@/components/system/connection-item";
import { ConnectDialog } from "@/components/system/connect-dialog";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { type Conversation, type LlmProvider, type System } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  currentConversationId?: number;
  onConversationSelect: (conversation: Conversation) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentConversationId,
  onConversationSelect
}: SidebarProps) {
  const isMobile = useMobile();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [llmSettingsOpen, setLlmSettingsOpen] = useState(false);

  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ['/api/systems'],
  });
  
  const { data: providers = [] } = useQuery<LlmProvider[]>({
    queryKey: ['/api/llm-providers'],
  });
  
  const { data: activeProvider } = useQuery<LlmProvider>({
    queryKey: ['/api/llm-providers/active'],
  });

  if (!isOpen) {
    return isMobile ? null : (
      <div className="hidden md:flex md:flex-col">
        <div className="fixed left-0 top-0 h-full w-10 bg-white border-r border-neutral-200 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="mt-4 mx-auto"
            onClick={onToggle}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileSidebar
        onClose={onToggle}
        systems={systems}
        providers={providers}
        activeProvider={activeProvider}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={onConversationSelect}
        onOpenConnectDialog={() => setConnectDialogOpen(true)}
        onOpenLlmSettings={() => setLlmSettingsOpen(true)}
      />
    );
  }

  return (
    <>
      <div className="flex flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-neutral-200">
          {/* Logo and App Title */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Ask Soe</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100"
              onClick={onToggle}
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Connected Systems Section */}
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-3">Connected Systems</h2>
            
            {systems.map((system) => (
              <ConnectionItem key={system.id} system={system} />
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full bg-primary-50 text-primary-500 border-primary-200 hover:bg-primary-100"
              onClick={() => setConnectDialogOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Connect System
            </Button>
          </div>
          
          {/* LLM Provider Section */}
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-3">LLM Provider</h2>
            
            <div className="relative">
              <Select defaultValue={activeProvider?.id?.toString()} onValueChange={() => setLlmSettingsOpen(true)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select LLM Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Recent Conversations */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Recent Conversations</h2>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {conversations.map((conversation) => (
              <Button 
                key={conversation.id}
                variant="ghost"
                className={`w-full justify-start py-2 px-3 h-auto mb-1 ${
                  conversation.id === currentConversationId ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                }`}
                onClick={() => {
                  console.log("Selecting conversation from desktop:", conversation);
                  onConversationSelect(conversation);
                }}
              >
                <div className="flex flex-col items-start w-full">
                  <p className="text-sm font-medium truncate w-full text-left">{conversation.title}</p>
                  <p className="text-xs text-neutral-500 text-left w-full">
                    {conversation.createdAt 
                      ? formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true }) 
                      : "Just now"}
                  </p>
                </div>
              </Button>
            ))}
          </div>
          
          {/* User Profile */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <UserIcon className="h-5 w-5" />
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Alex Morgan</p>
                <p className="text-xs text-neutral-500">Operations Manager</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connect System Dialog */}
      <ConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
      
      {/* LLM Settings Dialog */}
      <LlmSettingsDialog 
        open={llmSettingsOpen} 
        onOpenChange={setLlmSettingsOpen} 
        providers={providers}
        activeProvider={activeProvider}
      />
    </>
  );
}

interface MobileSidebarProps {
  onClose: () => void;
  systems: System[];
  providers: LlmProvider[];
  activeProvider?: LlmProvider;
  conversations: Conversation[];
  currentConversationId?: number;
  onConversationSelect: (conversation: Conversation) => void;
  onOpenConnectDialog: () => void;
  onOpenLlmSettings: () => void;
}

function MobileSidebar({
  onClose,
  systems,
  providers,
  activeProvider,
  conversations,
  currentConversationId,
  onConversationSelect,
  onOpenConnectDialog,
  onOpenLlmSettings
}: MobileSidebarProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
      <div className="absolute inset-y-0 left-0 w-3/4 max-w-xs bg-white flex flex-col">
        {/* Header with close button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Ask Soe</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100">
            <XIcon className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Sidebar Content - same as desktop but scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Connected Systems Section */}
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-3">Connected Systems</h2>
            
            {systems.map((system) => (
              <ConnectionItem key={system.id} system={system} />
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full bg-primary-50 text-primary-500 border-primary-200 hover:bg-primary-100"
              onClick={() => {
                onClose();
                onOpenConnectDialog();
              }}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Connect System
            </Button>
          </div>
          
          {/* LLM Provider Section */}
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-3">LLM Provider</h2>
            
            <div className="relative">
              <Select 
                defaultValue={activeProvider?.id?.toString()} 
                onValueChange={() => {
                  onClose();
                  onOpenLlmSettings();
                }}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select LLM Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Recent Conversations */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Recent Conversations</h2>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {conversations.map((conversation) => (
              <Button 
                key={conversation.id}
                variant="ghost"
                className={`w-full justify-start py-2 px-3 h-auto mb-1 ${
                  conversation.id === currentConversationId ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                }`}
                onClick={() => {
                  console.log("Selecting conversation from mobile:", conversation);
                  onConversationSelect(conversation);
                  onClose();
                }}
              >
                <div className="flex flex-col items-start w-full">
                  <p className="text-sm font-medium truncate w-full text-left">{conversation.title}</p>
                  <p className="text-xs text-neutral-500 text-left w-full">
                    {conversation.createdAt 
                      ? formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true }) 
                      : "Just now"}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>
        
        {/* User Profile */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <UserIcon className="h-5 w-5" />
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">Alex Morgan</p>
              <p className="text-xs text-neutral-500">Operations Manager</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LlmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: LlmProvider[];
  activeProvider?: LlmProvider;
}

function LlmSettingsDialog({ 
  open, 
  onOpenChange, 
  providers, 
  activeProvider 
}: LlmSettingsDialogProps) {
  const queryClient = useQueryClient();
  
  const activateMutation = useMutation({
    mutationFn: async (providerId: number) => {
      return apiRequest("POST", `/api/llm-providers/${providerId}/activate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers/active'],
      });
      onOpenChange(false);
    }
  });
  
  const handleActivateProvider = (providerId: number) => {
    activateMutation.mutate(providerId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>LLM Provider Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-4">
            {providers.map(provider => (
              <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs text-neutral-500">Model: {(provider.settings as any)?.model || "-"}</p>
                </div>
                
                {provider.isActive ? (
                  <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                    Active
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleActivateProvider(provider.id)}
                    disabled={activateMutation.isPending}
                  >
                    Activate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
