import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Database, Settings, Trash2, ExternalLink, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { type System } from "@/shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ConnectionItemProps {
  system: System;
  onDelete?: (id: number) => void;
}

export function ConnectionItem({ system, onDelete }: ConnectionItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Status indicator color
  const statusColor = {
    connected: "bg-success-500",
    limited: "bg-warning-500",
    disconnected: "bg-neutral-400",
    error: "bg-error-500",
  }[system.status] || "bg-neutral-400";
  
  // Last synced text
  const lastSyncedText = system.lastSynced 
    ? `Last synced: ${formatDistanceToNow(new Date(system.lastSynced), { addSuffix: true })}`
    : system.status === "connected" 
      ? "Connected" 
      : system.status === "limited" 
        ? "Connection limited" 
        : "Disconnected";

  return (
    <>
      <div className="flex items-center py-2">
        <div className={`w-2 h-2 rounded-full ${statusColor} mr-2`}></div>
        <div className="flex-1">
          <p className="text-sm font-medium">{system.name}</p>
          <p className="text-xs text-neutral-500">{lastSyncedText}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-neutral-400 hover:text-neutral-600"
          onClick={() => setIsEditOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      {/* System Settings Dialog */}
      <EditSystemDialog 
        system={system} 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)}
        onDelete={() => setIsDeleteOpen(true)}
      />
    </>
  );
}

interface EditSystemDialogProps {
  system: System;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

function EditSystemDialog({ system, isOpen, onClose, onDelete }: EditSystemDialogProps) {
  const [formData, setFormData] = useState({
    name: system.name,
    type: system.type,
    connectionDetails: system.connectionDetails,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateSystemMutation = useMutation({
    mutationFn: async (updatedSystem: Partial<System>) => {
      return apiRequest("PUT", `/api/systems/${system.id}`, updatedSystem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/systems'],
      });
      onClose();
    }
  });
  
  const handleSave = () => {
    updateSystemMutation.mutate({
      name: formData.name,
      type: formData.type,
      connectionDetails: formData.connectionDetails
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Connection Settings</DialogTitle>
          <DialogDescription>
            Configure your connection to {system.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="system-name">System Name</Label>
            <Input 
              id="system-name" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Connection Type</Label>
            <div className="text-sm px-3 py-2 border rounded-md bg-neutral-50">
              {formData.type.toUpperCase()}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                system.status === "connected" ? "bg-success-500" : 
                system.status === "limited" ? "bg-warning-500" : 
                "bg-error-500"
              }`}></div>
              <span className="text-sm capitalize">{system.status}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={onDelete}
            disabled={updateSystemMutation.isPending}
          >
            Disconnect
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateSystemMutation.isPending || formData.name === system.name}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
