import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Crown, UserPlus, Settings } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  accessLevel: string;
  subscriptionTier: string;
  isAdmin?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AdminConsoleProps {
  open: boolean;
  onClose: () => void;
}

export function AdminConsole({ open, onClose }: AdminConsoleProps) {
  const { toast } = useToast();
  const { username } = useAuth();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newUserDialog, setNewUserDialog] = useState(false);

  // Check if current user is master admin
  const isMasterAdmin = username === "dangshaw@gmail.com" || username?.toLowerCase().includes("dan");

  // Fetch all users with better error handling
  const { data: users = [], isLoading, refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("Admin API returned non-array data:", data);
        return [];
      }
      return data;
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AdminUser> }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      refetchUsers();
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      refetchUsers();
      setNewUserDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
  };

  const handleUpdateUser = (formData: FormData) => {
    if (!selectedUser) return;
    
    const updates = {
      accessLevel: formData.get("accessLevel") as string,
      subscriptionTier: formData.get("subscriptionTier") as string,
      isAdmin: formData.get("isAdmin") === "on",
    };
    
    updateUserMutation.mutate({ id: selectedUser.id, updates });
  };

  const handleCreateUser = (formData: FormData) => {
    const userData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      accessLevel: formData.get("accessLevel") as string,
      subscriptionTier: formData.get("subscriptionTier") as string,
      isAdmin: formData.get("isAdmin") === "on",
    };
    
    createUserMutation.mutate(userData);
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      pro: "bg-blue-100 text-blue-800", 
      enterprise: "bg-purple-100 text-purple-800",
      staff_admin: "bg-yellow-100 text-yellow-800"
    };
    return (
      <Badge className={colors[tier as keyof typeof colors] || colors.free}>
        {tier === 'staff_admin' ? 'STAFF ADMIN' : tier.toUpperCase()}
      </Badge>
    );
  };

  if (!isMasterAdmin) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-br from-[#002B5B] via-[#05458C] to-[#0A66C2] text-[#F4EFE6] border-white/20">
          <DialogHeader>
            <DialogTitle className="text-[#F4EFE6]">Access Denied</DialogTitle>
          </DialogHeader>
          <p className="text-[#F4EFE6]/80">You don't have administrator privileges.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl bg-gradient-to-br from-[#002B5B] via-[#05458C] to-[#0A66C2] text-[#F4EFE6] border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#F4EFE6] text-2xl">
              <Crown className="h-6 w-6 text-yellow-500" />
              <Settings className="h-6 w-6" />
              Staff Admin Console
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header with Add User Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#F4EFE6]">User Management</h3>
                <p className="text-[#F4EFE6]/80 text-sm">Manage all users and their access levels</p>
              </div>
              
              <Button 
                onClick={() => setNewUserDialog(true)}
                className="bg-white/20 hover:bg-white/30 text-[#F4EFE6] border-white/30"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            {/* Users Table */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-0">
                <div className="rounded-md border border-white/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-[#F4EFE6]">User</TableHead>
                        <TableHead className="text-[#F4EFE6]">Email</TableHead>
                        <TableHead className="text-[#F4EFE6]">Access Level</TableHead>
                        <TableHead className="text-[#F4EFE6]">Subscription</TableHead>
                        <TableHead className="text-[#F4EFE6]">Admin</TableHead>
                        <TableHead className="text-[#F4EFE6]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-[#F4EFE6]/60">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-[#F4EFE6]/60">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id} className="border-white/20">
                            <TableCell className="text-[#F4EFE6]">
                              <div className="flex items-center gap-2">
                                {user.username === "dangshaw@gmail.com" && <Crown className="h-4 w-4 text-yellow-500" />}
                                {user.username}
                              </div>
                            </TableCell>
                            <TableCell className="text-[#F4EFE6]">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.accessLevel === "admin" ? "default" : "secondary"}>
                                {user.accessLevel?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{getTierBadge(user.subscriptionTier)}</TableCell>
                            <TableCell>
                              {user.isAdmin ? (
                                <Badge className="bg-green-100 text-green-800">Yes</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[#F4EFE6] border-white/30">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="text-[#F4EFE6] hover:bg-white/20"
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateUser(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input name="username" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input name="password" type="password" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select name="accessLevel" defaultValue="read">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="write">Read/Write</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                <Select name="subscriptionTier" defaultValue="free">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="staff_admin">Staff Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox name="isAdmin" id="isAdmin" />
              <Label htmlFor="isAdmin">Admin Privileges</Label>
            </div>
            <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div>
                <Label>User: {selectedUser.username} ({selectedUser.email})</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <Select name="accessLevel" defaultValue={selectedUser.accessLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="write">Read/Write</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                  <Select name="subscriptionTier" defaultValue={selectedUser.subscriptionTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="staff_admin">Staff Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  name="isAdmin" 
                  id="isAdmin"
                  defaultChecked={selectedUser.isAdmin}
                />
                <Label htmlFor="isAdmin">Admin Privileges</Label>
              </div>

              <Button type="submit" className="w-full" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}