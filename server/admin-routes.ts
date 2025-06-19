import { Router, Request, Response } from "express";
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUserById,
  isStaffAdmin,
  User,
  CreateUserData 
} from "./user-storage";

export const adminRouter = Router();

// Middleware to require staff admin access
const requireStaffAdmin = async (req: Request, res: Response, next: any) => {
  console.log('=== ADMIN AUTH CHECK ===');
  console.log('Session authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no function');
  console.log('User from session:', req.user);
  console.log('Session ID:', req.sessionID);
  
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    console.log('No authenticated session found');
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const user = req.user as User;
  console.log('Checking staff admin status for user:', user.id, user.email);
  
  // Check if user is staff admin
  const isAdmin = await isStaffAdmin(user.id);
  console.log('Staff admin check result:', isAdmin);
  
  if (!isAdmin) {
    console.log('User is not staff admin');
    return res.status(403).json({ error: "Staff admin access required" });
  }
  
  console.log('Admin access granted');
  console.log('========================');
  next();
};

// GET all users - staff admin only
adminRouter.get("/users", requireStaffAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Fetching all users for admin dashboard');
    const users = await getAllUsers();
    
    // Remove sensitive data from response
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionTier: user.subscriptionTier,
      accessLevel: user.accessLevel,
      tenantId: user.tenantId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
    
    console.log('Returning', safeUsers.length, 'users to admin');
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST create new user - staff admin only
adminRouter.post("/users", requireStaffAdmin, async (req: Request, res: Response) => {
  try {
    console.log('FULL REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    let { username, email, password, firstName, lastName, subscriptionTier, accessLevel, tenantId } = req.body;

    // Force correct values regardless of what frontend sends
    if (subscriptionTier === 'pro') subscriptionTier = 'enterprise';
    if (accessLevel === 'write') accessLevel = 'admin';
    if (accessLevel === 'read') accessLevel = 'user';
    if (!tenantId) tenantId = 'default';

    console.log('NORMALIZED VALUES:', { subscriptionTier, accessLevel, tenantId });

    // Simple validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const userData: CreateUserData = {
      username,
      email, 
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      subscriptionTier: subscriptionTier as 'free' | 'enterprise' | 'staff_admin',
      accessLevel: accessLevel as 'user' | 'admin',
      tenantId
    };

    console.log('FINAL USER DATA:', userData);
    const newUser = await createUser(userData);

    console.log('SUCCESS - User created:', newUser.id);
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      subscriptionTier: newUser.subscriptionTier,
      accessLevel: newUser.accessLevel,
      tenantId: newUser.tenantId,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      lastLoginAt: newUser.lastLoginAt
    });
  } catch (error) {
    console.error('ERROR creating user:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create user" });
  }
});

// PUT update user - staff admin only
adminRouter.put("/users/:id", requireStaffAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    console.log('Admin updating user:', userId, 'with:', updates);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.id;
    delete updates.createdAt;

    // Validate and normalize subscription tier if provided
    if (updates.subscriptionTier) {
      const tierMapping: Record<string, string> = {
        'free': 'free',
        'enterprise': 'enterprise', 
        'pro': 'enterprise',
        'staff_admin': 'staff_admin'
      };
      
      const normalizedTier = tierMapping[updates.subscriptionTier];
      if (!normalizedTier) {
        return res.status(400).json({ error: "Invalid subscription tier. Use: free, enterprise, or staff_admin" });
      }
      updates.subscriptionTier = normalizedTier as 'free' | 'enterprise' | 'staff_admin';
    }

    // Validate and normalize access level if provided
    if (updates.accessLevel) {
      const levelMapping: Record<string, string> = {
        'user': 'user',
        'admin': 'admin',
        'write': 'admin',
        'read': 'user'
      };
      
      const normalizedLevel = levelMapping[updates.accessLevel];
      if (!normalizedLevel) {
        return res.status(400).json({ error: "Invalid access level. Use: user or admin" });
      }
      updates.accessLevel = normalizedLevel as 'user' | 'admin';
    }

    const updatedUser = await updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return safe user data
    const safeUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      subscriptionTier: updatedUser.subscriptionTier,
      accessLevel: updatedUser.accessLevel,
      tenantId: updatedUser.tenantId,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt
    };

    console.log('User updated successfully by admin:', userId);
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE user - staff admin only
adminRouter.delete("/users/:id", requireStaffAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    console.log('Admin deleting user:', userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Prevent admin from deleting themselves
    const currentUser = req.user as User;
    if (currentUser.id === userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const success = await deleteUser(userId);

    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('User deleted successfully by admin:', userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET admin stats - staff admin only
adminRouter.get("/stats", requireStaffAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Fetching admin stats');
    const users = await getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      subscriptionBreakdown: {
        free: users.filter(u => u.subscriptionTier === 'free').length,
        enterprise: users.filter(u => u.subscriptionTier === 'enterprise').length,
        staff_admin: users.filter(u => u.subscriptionTier === 'staff_admin').length
      },
      accessLevelBreakdown: {
        user: users.filter(u => u.accessLevel === 'user').length,
        admin: users.filter(u => u.accessLevel === 'admin').length
      },
      tenantBreakdown: users.reduce((acc, user) => {
        acc[user.tenantId] = (acc[user.tenantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    console.log('Returning admin stats');
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});