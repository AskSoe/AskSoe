import { z } from "zod";

// Access level enum
export const AccessLevel = {
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
} as const;

export type AccessLevelType = typeof AccessLevel[keyof typeof AccessLevel];

// Subscription tier enum
export const SubscriptionTier = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
  STAFF_ADMIN: "staff_admin",
} as const;

export type SubscriptionTierType = typeof SubscriptionTier[keyof typeof SubscriptionTier];

// Auth provider enum
export const AuthProvider = {
  LOCAL: "local",
  SALESFORCE: "salesforce",
  GOOGLE: "google",
  MICROSOFT: "microsoft",
} as const;

export type AuthProviderType = typeof AuthProvider[keyof typeof AuthProvider];

// Document type enum
export const DocumentType = {
  PDF: "pdf",
  DOCX: "docx",
  TXT: "txt",
  CSV: "csv",
  XLSX: "xlsx",
} as const;

export type DocumentTypeType = typeof DocumentType[keyof typeof DocumentType];

// Subscription tier details
export const tierLimits = {
  [SubscriptionTier.FREE]: {
    maxSystems: 1,
    canWrite: false,
    description: "Connect to a single system with read-only access.",
    price: 0,
    maxQueries: 10
  },
  [SubscriptionTier.PRO]: {
    maxSystems: 5,
    canWrite: true,
    description: "Connect to multiple systems with full access.",
    price: 29,
    maxQueries: 1000
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxSystems: 20,
    canWrite: true,
    description: "Enterprise-grade access with priority support.",
    price: 99,
    maxQueries: 10000
  },
  [SubscriptionTier.STAFF_ADMIN]: {
    maxSystems: 50,
    canWrite: true,
    description: "Staff and admin access with unlimited queries.",
    price: 0,
    maxQueries: -1
  },
} as const;

// Frontend-safe type definitions (without Drizzle dependencies)
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  authProvider: AuthProviderType;
  authProviderId?: string;
  accessLevel: AccessLevelType;
  subscriptionTier: SubscriptionTierType;
  systemsConnected: number;
  isAdmin: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  queryCount: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface System {
  id: number;
  name: string;
  type: string;
  connectionDetails: Record<string, any>;
  status: string;
  lastSynced?: string;
  userId?: number;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  userId?: number;
}

export interface Message {
  id: number;
  conversationId: number;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
  systemSources?: any[];
  visualizations?: any[];
}

export interface Document {
  id: number;
  name: string;
  type: DocumentTypeType;
  size: number;
  path: string;
  content?: string;
  metadata?: Record<string, any>;
  userId?: number;
  conversationId?: number;
  createdAt: string;
  analyzedAt?: string;
  status: "pending" | "processing" | "completed" | "error";
}

export interface LlmProvider {
  id: number;
  name: string;
  type: string;
  settings?: Record<string, any>;
  isActive: boolean;
}

export interface OauthToken {
  id: number;
  userId: number;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  tokenData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Request/Response schemas for API calls
export const userLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const userRegisterSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const messageRequestSchema = z.object({
  conversationId: z.number(),
  content: z.string().min(1),
  systemIds: z.array(z.number()).optional(),
});

export const systemConnectionRequestSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  connectionDetails: z.record(z.any()),
});

export const documentUploadRequestSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().positive(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  conversationId: z.number().optional(),
});

export const llmProviderRequestSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  apiKey: z.string().optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// Type exports for request/response schemas
export type UserLoginRequest = z.infer<typeof userLoginSchema>;
export type UserRegisterRequest = z.infer<typeof userRegisterSchema>;
export type MessageRequest = z.infer<typeof messageRequestSchema>;
export type SystemConnectionRequest = z.infer<typeof systemConnectionRequestSchema>;
export type DocumentUploadRequest = z.infer<typeof documentUploadRequestSchema>;
export type LlmProviderRequest = z.infer<typeof llmProviderRequestSchema>;

// Chart and visualization types
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  title: string;
  source?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface TableData {
  headers: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
  }>;
  rows: Array<Record<string, any>>;
  source?: string;
}

// Utility functions for frontend
export function getUserPlan(tier: SubscriptionTierType) {
  return tierLimits[tier];
}

export function canPerformWrite(accessLevel: AccessLevelType): boolean {
  return accessLevel === AccessLevel.WRITE || accessLevel === AccessLevel.ADMIN;
}

export function getAccessLevel(accessLevel: AccessLevelType): string {
  switch (accessLevel) {
    case AccessLevel.READ:
      return "Read Only";
    case AccessLevel.WRITE:
      return "Read & Write";
    case AccessLevel.ADMIN:
      return "Admin";
    default:
      return "Unknown";
  }
}