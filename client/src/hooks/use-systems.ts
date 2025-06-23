import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { type System } from "@/shared/schema";
import { fetchSystems, connectSystem, updateSystem, disconnectSystem } from "@/lib/api";

export function useSystems() {
  const { data: systems = [], isLoading, isError, error } = useQuery<System[]>({
    queryKey: ['/api/systems'],
  });
  
  return {
    systems,
    isLoading,
    isError,
    error
  };
}

export function useAddSystem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async (system: { name: string; type: string; connectionDetails: any }) => {
      return apiRequest("POST", "/api/systems", system);
    },
    onSuccess: () => {
      toast({
        title: "System added",
        description: "The system was successfully connected"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/systems'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding system",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}

export function useUpdateSystem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<System> }) => {
      return apiRequest("PUT", `/api/systems/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "System updated",
        description: "The system was successfully updated"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/systems'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating system",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}

export function useDeleteSystem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/systems/${id}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "System disconnected",
        description: "The system was successfully disconnected"
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/systems'],
      });
    },
    onError: (error) => {
      toast({
        title: "Error disconnecting system",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}
