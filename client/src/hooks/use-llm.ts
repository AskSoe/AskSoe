import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { type LlmProvider } from "@shared/schema";
import { 
  fetchLlmProviders, 
  fetchActiveLlmProvider, 
  addLlmProvider, 
  updateLlmProvider, 
  activateLlmProvider 
} from "@/lib/api";

export function useLlmProviders() {
  const { data: providers = [], isLoading, isError, error } = useQuery<LlmProvider[]>({
    queryKey: ['/api/llm-providers'],
  });
  
  const { data: activeProvider } = useQuery<LlmProvider>({
    queryKey: ['/api/llm-providers/active'],
  });
  
  return {
    providers,
    activeProvider,
    isLoading,
    isError,
    error
  };
}

export function useActivateLlmProvider() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async (providerId: number) => {
      return apiRequest("POST", `/api/llm-providers/${providerId}/activate`, {});
    },
    onSuccess: () => {
      toast({
        title: "LLM provider activated",
        description: "The LLM provider was successfully activated"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers/active'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error activating LLM provider",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}

export function useAddLlmProvider() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async (provider: { 
      name: string; 
      type: string; 
      apiKey?: string;
      settings?: any;
      isActive?: boolean;
    }) => {
      return apiRequest("POST", "/api/llm-providers", provider);
    },
    onSuccess: () => {
      toast({
        title: "LLM provider added",
        description: "The LLM provider was successfully added"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding LLM provider",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}

export function useUpdateLlmProvider() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: Partial<LlmProvider> 
    }) => {
      return apiRequest("PUT", `/api/llm-providers/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "LLM provider updated",
        description: "The LLM provider was successfully updated"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/llm-providers'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating LLM provider",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}
