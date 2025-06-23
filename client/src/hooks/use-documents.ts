import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import {
  fetchDocuments,
  fetchUserDocuments,
  fetchDocument,
  fetchConversationDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument
} from "@/lib/documentApi";
import { type Document, type DocumentUploadRequest } from "../shared/schema";

/**
 * Hook to fetch all documents
 */
export function useDocuments() {
  return useQuery({
    queryKey: ["/api/documents"],
    queryFn: fetchDocuments
  });
}

/**
 * Hook to fetch documents for a specific conversation
 */
export function useConversationDocuments(conversationId: number | undefined) {
  return useQuery({
    queryKey: conversationId ? [`/api/conversations/${conversationId}/documents`] : [],
    queryFn: () => {
      if (!conversationId) {
        return Promise.resolve([]);
      }
      return fetchConversationDocuments(conversationId);
    },
    enabled: !!conversationId
  });
}

/**
 * Hook to upload a new document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (document: DocumentUploadRequest) => uploadDocument(document),
    onSuccess: (document: Document) => {
      // Invalidate documents queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (document.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${document.conversationId}/documents`] 
        });
      }
      
      toast({
        title: "Document uploaded",
        description: `${document.name} has been uploaded successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    }
  });
}

/**
 * Hook to update an existing document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<DocumentUploadRequest> }) => 
      updateDocument(id, updates),
    onSuccess: (document: Document) => {
      // Invalidate document queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}`] });
      if (document.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${document.conversationId}/documents`] 
        });
      }
      
      toast({
        title: "Document updated",
        description: `${document.name} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update document. Please try again.",
        variant: "destructive",
      });
    }
  });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: (_, id) => {
      // Since we don't know the conversation ID at this point, 
      // we need to invalidate all document queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  });
}