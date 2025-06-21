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
    canWrite: false,
    description: "Connect up to 5 systems with read-only access.",
    price: 19.99,
    maxQueries: -1 // unlimited
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxSystems: 10,
    canWrite: true,
    description: "Connect up to 10 systems with read and write capabilities.",
    price: 49.99,
    maxQueries: -1 // unlimited
  },
  [SubscriptionTier.STAFF_ADMIN]: {
    maxSystems: -1, // unlimited
    canWrite: true,
    description: "Full administrative access with unlimited system connections.",
    price: 0,
    maxQueries: -1 // unlimited
  }
};

// Authentication provider enum
export const AuthProvider = {
  LOCAL: "local",
  GOOGLE: "google",
  APPLE: "apple",
  SALESFORCE: "salesforce",
} as const;

export type AuthProviderType = typeof AuthProvider[keyof typeof AuthProvider];

// Document types enum
export const DocumentType = {
  PDF: "pdf",
  TEXT: "text",
  CSV: "csv",
  JSON: "json",
  DOCX: "docx",
  XLSX: "xlsx",
} as const;

export type DocumentTypeType = typeof DocumentType[keyof typeof DocumentType];

// Define LLM settings type
export const llmSettingsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export type LlmSettings = z.infer<typeof llmSettingsSchema>;

// Message content schema for API
export const messageContentSchema = z.object({
  type: z.enum(["text", "chart", "table", "image", "processing"]),
  content: z.any(), // Content specific to the type
  sources: z.array(z.string()).optional(),
});

export type MessageContent = z.infer<typeof messageContentSchema>;

// Chart data schemas
export const chartDataSchema = z.object({
  type: z.enum(["bar", "line", "pie", "scatter"]),
  title: z.string(),
  labels: z.array(z.string()),
  datasets: z.array(z.object({
    label: z.string(),
    data: z.array(z.number()),
    backgroundColor: z.array(z.string()).optional(),
    borderColor: z.string().optional(),
  })),
  source: z.string().optional(),
});

export type ChartData = z.infer<typeof chartDataSchema>;

// Table data schema
export const tableDataSchema = z.object({
  headers: z.array(z.object({
    key: z.string(),
    label: z.string(),
    align: z.enum(["left", "center", "right"]).optional(),
  })),
  rows: z.array(z.record(z.string(), z.any())),
  source: z.string().optional(),
});

export type TableData = z.infer<typeof tableDataSchema>;

// Request schemas
export const messageRequestSchema = z.object({
  content: z.string(),
  conversationId: z.number().nullable().optional(),
});

export type MessageRequest = z.infer<typeof messageRequestSchema>;

export const systemConnectionRequestSchema = z.object({
  name: z.string(),
  type: z.string(),
  connectionDetails: z.record(z.string(), z.any()),
});

export type SystemConnectionRequest = z.infer<typeof systemConnectionRequestSchema>;

export const llmProviderRequestSchema = z.object({
  name: z.string(),
  type: z.string(),
  apiKey: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

export type LlmProviderRequest = z.infer<typeof llmProviderRequestSchema>;

// OAuth related schemas
export const salesforceOAuthInitSchema = z.object({
  accessLevel: z.enum([AccessLevel.READ, AccessLevel.WRITE]),
});

export type SalesforceOAuthInitRequest = z.infer<typeof salesforceOAuthInitSchema>;

export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type OauthCallbackRequest = z.infer<typeof oauthCallbackSchema>;

export const systemWithAccessSchema = z.object({
  system: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    lastSynced: z.string().nullable(),
  }),
  accessLevel: z.enum([AccessLevel.READ, AccessLevel.WRITE]),
  hasToken: z.boolean(),
});

export type SystemWithAccess = z.infer<typeof systemWithAccessSchema>;

// Document upload request schema
export const documentUploadRequestSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string(),
  size: z.number(),
  content: z.string().nullable().optional(),
  metadata: z.any().optional(),
  userId: z.number().nullable().optional(),
  conversationId: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type DocumentUploadRequest = z.infer<typeof documentUploadRequestSchema>;

// Document analysis result schema
export const documentAnalysisSchema = z.object({
  documentId: z.number(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  entities: z.array(z.object({
    name: z.string(),
    type: z.string(),
    confidence: z.number().optional(),
  })).optional(),
  sentiment: z.object({
    score: z.number(),
    label: z.string(),
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

// Frontend-safe type definitions (these will be imported from server/schema.ts in backend)
export type User = {
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
};

export type System = {
  id: number;
  name: string;
  type: string;
  connectionDetails: Record<string, any>;
  status: string;
  lastSynced?: string;
  userId?: number;
};

export type LlmProvider = {
  id: number;
  name: string;
  type: string;
  apiKey?: string;
  settings: Record<string, any>;
  isActive: boolean;
};

export type Conversation = {
  id: number;
  title: string;
  createdAt: string;
  userId?: number;
};

export type Message = {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  timestamp: string;
  systemSources: any[];
  visualizations: any[];
};

export type Document = {
  id: number;
  name: string;
  type: string;
  size: number;
  path: string;
  content?: string;
  metadata: Record<string, any>;
  userId?: number;
  conversationId?: number;
  createdAt: string;
  analyzedAt?: string;
  status: string;
};
