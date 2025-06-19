import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Types for multi-tenant authentication
export interface TenantUser {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface TenantCredentials {
  tenantId: string;
  appType: string; // 'salesforce', 'hubspot', 'tableau', etc.
  credentials: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    [key: string]: any;
  };
  encryptedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: TenantUser;
  tenantId?: string;
}

// In-memory storage for development (will be replaced with database)
class TenantAuthStorage {
  private users: Map<string, TenantUser> = new Map();
  private credentials: Map<string, TenantCredentials[]> = new Map();
  private sessions: Map<string, { userId: string; tenantId: string; expiresAt: Date }> = new Map();

  // User management
  async createUser(email: string, password: string, tenantId?: string): Promise<TenantUser> {
    const userId = this.generateId();
    const finalTenantId = tenantId || this.generateId();
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    const user: TenantUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      tenantId: finalTenantId,
      role: 'admin', // First user in tenant becomes admin
      createdAt: new Date()
    };
    
    this.users.set(userId, user);
    return user;
  }

  async validateUser(email: string, password: string): Promise<TenantUser | null> {
    const user = Array.from(this.users.values()).find(u => u.email === email.toLowerCase());
    
    if (!user) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    this.users.set(user.id, user);
    
    return user;
  }

  async getUserById(userId: string): Promise<TenantUser | null> {
    return this.users.get(userId) || null;
  }

  async getUsersByTenant(tenantId: string): Promise<TenantUser[]> {
    return Array.from(this.users.values()).filter(u => u.tenantId === tenantId);
  }

  // Credential management with encryption
  async saveTenantCredentials(tenantId: string, appType: string, credentials: any): Promise<void> {
    const encryptedCreds = this.encryptCredentials(credentials);
    
    const credentialEntry: TenantCredentials = {
      tenantId,
      appType,
      credentials: encryptedCreds,
      encryptedAt: new Date()
    };
    
    const tenantCreds = this.credentials.get(tenantId) || [];
    const existingIndex = tenantCreds.findIndex(c => c.appType === appType);
    
    if (existingIndex >= 0) {
      tenantCreds[existingIndex] = credentialEntry;
    } else {
      tenantCreds.push(credentialEntry);
    }
    
    this.credentials.set(tenantId, tenantCreds);
  }

  async getTenantCredentials(tenantId: string, appType?: string): Promise<TenantCredentials[]> {
    const tenantCreds = this.credentials.get(tenantId) || [];
    
    if (appType) {
      const cred = tenantCreds.find(c => c.appType === appType);
      return cred ? [{ ...cred, credentials: this.decryptCredentials(cred.credentials) }] : [];
    }
    
    return tenantCreds.map(c => ({
      ...c,
      credentials: this.decryptCredentials(c.credentials)
    }));
  }

  async deleteTenantCredentials(tenantId: string, appType: string): Promise<boolean> {
    const tenantCreds = this.credentials.get(tenantId) || [];
    const filteredCreds = tenantCreds.filter(c => c.appType !== appType);
    
    if (filteredCreds.length !== tenantCreds.length) {
      this.credentials.set(tenantId, filteredCreds);
      return true;
    }
    
    return false;
  }

  // Session management
  createSession(userId: string, tenantId: string): string {
    const sessionId = this.generateId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    this.sessions.set(sessionId, { userId, tenantId, expiresAt });
    return sessionId;
  }

  getSession(sessionId: string): { userId: string; tenantId: string } | null {
    const session = this.sessions.get(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return { userId: session.userId, tenantId: session.tenantId };
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Utility methods
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  private encryptCredentials(credentials: any): any {
    // Simple encryption for demo - in production use proper encryption
    const encrypted = Buffer.from(JSON.stringify(credentials)).toString('base64');
    return { encrypted };
  }

  private decryptCredentials(encryptedCreds: any): any {
    if (encryptedCreds.encrypted) {
      return JSON.parse(Buffer.from(encryptedCreds.encrypted, 'base64').toString());
    }
    return encryptedCreds;
  }
}

// Global storage instance
export const tenantStorage = new TenantAuthStorage();

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.session as any)?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded.user;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

// Tenant isolation middleware
export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  next();
}

// Admin role middleware
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

// Helper functions
export async function getTenantCredentials(tenantId: string, appType?: string): Promise<TenantCredentials[]> {
  return await tenantStorage.getTenantCredentials(tenantId, appType);
}

export async function saveTenantCredentials(tenantId: string, appType: string, credentials: any): Promise<void> {
  return await tenantStorage.saveTenantCredentials(tenantId, appType, credentials);
}

export function generateJWT(user: TenantUser): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { 
      user: { id: user.id, email: user.email, role: user.role },
      tenantId: user.tenantId 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}