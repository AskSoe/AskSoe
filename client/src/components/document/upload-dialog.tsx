import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth-context";
import { useAuthDialogProvider } from "@/components/auth/auth-provider";
import { type Document } from '@shared/schema';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, File } from "lucide-react";

interface UploadDialogProps {
  conversationId?: number;
  onSuccess?: (document: Document) => void;
}

export function DocumentUploadDialog({ conversationId, onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { openAuthDialog } = useAuthDialogProvider();

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/documents", data);
      return await response.json();
    },
    onSuccess: (document: Document) => {
      toast({
        title: "Document uploaded",
        description: `${document.name || ''} has been uploaded successfully`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${conversationId}/documents`] 
        });
      }
      
      // Close dialog
      setOpen(false);
      setSelectedFile(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(document);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here we'd extract the document metadata
      // For demonstration, we'll create an object with the necessary data
      const documentData = {
        name: selectedFile.name,
        type: selectedFile.type || "application/octet-stream",
        size: selectedFile.size,
        path: `/uploads/${selectedFile.name}`, // Placeholder path
        conversationId: conversationId || null,
        content: null, // Content will be extracted on the server
        metadata: {
          lastModified: selectedFile.lastModified
        }
      };
      
      // Start upload mutation
      uploadMutation.mutate(documentData);
    } catch (error) {
      toast({
        title: "Upload preparation failed",
        description: "Failed to prepare the file for upload",
        variant: "destructive",
      });
      console.error("Upload preparation error:", error);
    }
  };

  // Function to handle upload dialog opening
  const handleOpenUpload = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Show login dialog instead
      openAuthDialog();
      
      // Show toast message
      toast({
        title: "Login Required",
        description: "Please log in to upload documents.",
        variant: "default"
      });
      return;
    }
    
    // If authenticated, open the upload dialog
    setOpen(true);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={(e) => {
          e.preventDefault(); // Prevent the default dialog trigger
          handleOpenUpload();
        }}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Select document to upload</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <span className="text-xs">({Math.round(selectedFile.size / 1024)} KB)</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}