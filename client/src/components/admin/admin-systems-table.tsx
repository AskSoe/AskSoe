import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { type System, type User } from "@shared/schema";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, RefreshCw } from 'lucide-react';

interface AdminSystemsTableProps {
  systems: System[];
  users: User[];
}

export function AdminSystemsTable({ systems, users }: AdminSystemsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get username by user ID
  const getUsernameById = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown User';
  };
  
  // Format last synced date
  const formatLastSynced = (dateString?: string | Date | null): string => {
    if (!dateString) return 'Never';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Connected</Badge>;
      case 'limited':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400"><AlertCircle className="h-3 w-3 mr-1" /> Limited</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Mutation for refreshing system connection
  const refreshSystemMutation = useMutation({
    mutationFn: async (systemId: number) => {
      const res = await apiRequest('POST', `/api/systems/${systemId}/refresh`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/systems'] });
      toast({
        title: 'System Refreshed',
        description: 'The system connection has been refreshed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh system connection.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for deleting a system
  const deleteSystemMutation = useMutation({
    mutationFn: async (systemId: number) => {
      const res = await apiRequest('DELETE', `/api/systems/${systemId}`);
      return res.status === 204 ? undefined : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/systems'] });
      toast({
        title: 'System Deleted',
        description: 'The system has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete system.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle system refresh
  const handleRefreshSystem = async (systemId: number) => {
    await refreshSystemMutation.mutateAsync(systemId);
  };
  
  // Handle system deletion with confirmation
  const handleDeleteSystem = async (systemId: number, systemName: string) => {
    if (window.confirm(`Are you sure you want to delete the system "${systemName}"? This action cannot be undone.`)) {
      await deleteSystemMutation.mutateAsync(systemId);
    }
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Synced</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {systems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                No systems found
              </TableCell>
            </TableRow>
          ) : (
            systems.map((system) => (
              <TableRow key={system.id}>
                <TableCell className="font-medium">{system.name}</TableCell>
                <TableCell className="capitalize">{system.type}</TableCell>
                <TableCell>{getUsernameById(system.userId || 0)}</TableCell>
                <TableCell>{getStatusBadge(system.status)}</TableCell>
                <TableCell>{formatLastSynced(system.lastSynced || '')}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRefreshSystem(system.id)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Connection
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSystem(system.id, system.name)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete System
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}