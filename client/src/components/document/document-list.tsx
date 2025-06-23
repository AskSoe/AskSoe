import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Document } from '@/shared/schema';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Loader2
} from "lucide-react";
import { DocumentUploadDialog } from "./upload-dialog";

interface DocumentListProps {
  conversationId?: number;
  showUploadButton?: boolean;
}

export function DocumentList({ conversationId, showUploadButton = true }: DocumentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

  // Query to fetch documents
  const queryKey = conversationId 
    ? [`/api/conversations/${conversationId}/documents`]
    : ["/api/documents"];
    
  const { data: documents, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const url = conversationId 
        ? `/api/conversations/${conversationId}/documents` 
        : "/api/documents";
      const res = await apiRequest("GET", url);
      return await res.json() as Document[];
    }
  });

  // Mutation to delete a document
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Document deleted",
        description: "The document has been removed successfully",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${conversationId}/documents`] 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete document. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "processed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Failed to load documents</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="mt-2 text-muted-foreground">No documents found</p>
          {showUploadButton && (
            <div className="mt-4">
              <DocumentUploadDialog 
                conversationId={conversationId}
                onSuccess={() => queryClient.invalidateQueries({ queryKey })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showUploadButton && (
        <div className="flex justify-end mb-4">
          <DocumentUploadDialog 
            conversationId={conversationId}
            onSuccess={() => queryClient.invalidateQueries({ queryKey })}
          />
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow 
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      {doc.name || ''}
                    </div>
                  </TableCell>
                  <TableCell>{doc.type || ''}</TableCell>
                  <TableCell>{Math.round(doc.size / 1024)} KB</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(doc.status)}
                      <span>{doc.status || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}