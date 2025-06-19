import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Settings, MoreHorizontal, Shield, ShieldAlert } from 'lucide-react';
import { getUserPlan } from '@/lib/userPlanUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AdminTierChangeDialog } from './admin-tier-change';
import { type User as UserType, type SubscriptionTierType, SubscriptionTier } from "@shared/schema";

// Define a type for the user data with admin context
interface AdminUser extends UserType {
  systemCount?: number;
  lastActive?: string;
}

interface AdminUsersTableProps {
  users: UserType[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Admin mutation to toggle admin status
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const res = await apiRequest('PUT', `/api/users/${userId}/admin-status`, { isAdmin });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'User Updated',
        description: 'Admin status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user admin status.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle toggling admin status
  const handleToggleAdmin = async (user: AdminUser) => {
    await toggleAdminMutation.mutateAsync({ 
      userId: user.id, 
      isAdmin: !user.isAdmin 
    });
  };
  
  // Handle opening the tier change dialog
  const handleOpenTierChange = (user: AdminUser) => {
    setSelectedUser(user);
    setShowTierChangeDialog(true);
  };
  
  // Render user initials for avatar
  const getUserInitials = (user: AdminUser): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead>Systems</TableHead>
              <TableHead>Queries</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const plan = getUserPlan(user.subscriptionTier as SubscriptionTierType || SubscriptionTier.FREE);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.profileImage || ''} alt={user.username} />
                          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={plan.badge.color}>
                        {plan.displayName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.accessLevel === 'write' ? 'default' : 'outline'}>
                        {user.accessLevel === 'write' ? 'READ/WRITE' : 'READ-ONLY'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.systemsConnected} / {plan.maxSystems}
                    </TableCell>
                    <TableCell>{user.queryCount}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="default" className="bg-red-500">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenTierChange(user)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                            {user.isAdmin ? (
                              <>
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {selectedUser && (
        <AdminTierChangeDialog
          user={selectedUser}
          open={showTierChangeDialog}
          onOpenChange={setShowTierChangeDialog}
        />
      )}
    </>
  );
}