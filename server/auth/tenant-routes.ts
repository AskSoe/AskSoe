import { Router, Request, Response } from "express";
import { 
  tenantStorage, 
  requireAuth, 
  requireTenant, 
  requireAdmin,
  generateJWT,
  AuthenticatedRequest,
  TenantUser 
} from "./tenant-auth";

const router = Router();

// Registration endpoint
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await tenantStorage.validateUser(email, "dummy");
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create new user and tenant
    const user = await tenantStorage.createUser(email, password);
    const token = generateJWT(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role
      },
      token,
      message: "Registration successful"
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login endpoint
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await tenantStorage.validateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateJWT(user);

    // Store token in session for compatibility
    if (req.session) {
      req.session.token = token;
      req.session.userId = user.id;
      req.session.tenantId = user.tenantId;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      },
      token,
      message: "Login successful"
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user
router.get("/user", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await tenantStorage.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      lastLoginAt: user.lastLoginAt
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Logout endpoint
router.post("/logout", (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  } else {
    res.json({ message: "Logout successful" });
  }
});

// Tenant credential management
router.get("/tenant/credentials", requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appType } = req.query;
    const credentials = await tenantStorage.getTenantCredentials(
      req.tenantId!,
      appType as string
    );

    // Remove sensitive data for response
    const sanitizedCredentials = credentials.map(cred => ({
      appType: cred.appType,
      hasCredentials: Object.keys(cred.credentials).length > 0,
      encryptedAt: cred.encryptedAt
    }));

    res.json(sanitizedCredentials);
  } catch (error) {
    console.error("Get credentials error:", error);
    res.status(500).json({ error: "Failed to get credentials" });
  }
});

router.post("/tenant/credentials", requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appType, credentials } = req.body;

    if (!appType || !credentials) {
      return res.status(400).json({ error: "appType and credentials are required" });
    }

    await tenantStorage.saveTenantCredentials(req.tenantId!, appType, credentials);

    res.json({ 
      message: "Credentials saved successfully",
      appType,
      savedAt: new Date()
    });
  } catch (error) {
    console.error("Save credentials error:", error);
    res.status(500).json({ error: "Failed to save credentials" });
  }
});

router.delete("/tenant/credentials/:appType", requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appType } = req.params;
    const deleted = await tenantStorage.deleteTenantCredentials(req.tenantId!, appType);

    if (!deleted) {
      return res.status(404).json({ error: "Credentials not found" });
    }

    res.json({ message: "Credentials deleted successfully" });
  } catch (error) {
    console.error("Delete credentials error:", error);
    res.status(500).json({ error: "Failed to delete credentials" });
  }
});

// Admin endpoints for tenant management
router.get("/tenant/users", requireAuth, requireTenant, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await tenantStorage.getUsersByTenant(req.tenantId!);
    
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Get tenant users error:", error);
    res.status(500).json({ error: "Failed to get tenant users" });
  }
});

// Health check for tenant context
router.get("/tenant/status", requireAuth, requireTenant, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    tenantId: req.tenantId,
    userId: req.user!.id,
    role: req.user!.role,
    timestamp: new Date()
  });
});

export default router;