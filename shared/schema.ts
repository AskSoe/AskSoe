import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

// Users table (extended with subscription tier and auth methods)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"), // Can be null for OAuth users
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImage: text("profile_image"),
  authProvider: text("auth_provider").default(AuthProvider.LOCAL),
  authProviderId: text("auth_provider_id"), // External ID from the auth provider
  accessLevel: text("access_level").default(AccessLevel.READ),
  subscriptionTier: text("subscription_tier").default(SubscriptionTier.FREE),
  systemsConnected: integer("systems_connected").default(0),
  isAdmin: boolean("is_admin").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  queryCount: integer("query_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at")
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImage: true,
  authProvider: true,
  authProviderId: true,
  accessLevel: true,
  subscriptionTier: true,
  isAdmin: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  queryCount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OAuth tokens table
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  provider: text("provider").notNull(), // e.g., "salesforce"
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scopes: text("scopes").array(),
  tokenData: jsonb("token_data"), // Additional token data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOauthTokenSchema = createInsertSchema(oauthTokens).pick({
  userId: true,
  provider: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
  scopes: true,
  tokenData: true,
});

export type InsertOauthToken = z.infer<typeof insertOauthTokenSchema>;
export type OauthToken = typeof oauthTokens.$inferSelect;

// System connections table
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "crm", "erp", "visualization", etc.
  connectionDetails: jsonb("connection_details").notNull(), // API keys, URLs, etc.
  status: text("status").notNull().default("connected"), // "connected", "disconnected", "error"
  lastSynced: timestamp("last_synced"),
  userId: integer("user_id").references(() => users.id),
});

export const insertSystemSchema = createInsertSchema(systems).pick({
  name: true,
  type: true,
  connectionDetails: true,
  status: true,
  userId: true,
});

export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systems.$inferSelect;

// Define LLM settings type
export const llmSettingsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export type LlmSettings = z.infer<typeof llmSettingsSchema>;

// LLM providers table
export const llmProviders = pgTable("llm_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "openai", "anthropic", "azure", etc.
  apiKey: text("api_key"),
  settings: jsonb("settings").default({}), // model name, temperature, etc.
  isActive: boolean("is_active").default(false),
});

export const insertLlmProviderSchema = createInsertSchema(llmProviders).pick({
  name: true,
  type: true,
  apiKey: true,
  settings: true,
  isActive: true,
});

export type InsertLlmProvider = z.infer<typeof insertLlmProviderSchema>;
export type LlmProvider = typeof llmProviders.$inferSelect;

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  userId: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  timestamp: timestamp("timestamp").defaultNow(),
  systemSources: jsonb("system_sources").default([]), // Which systems were used
  visualizations: jsonb("visualizations").default([]), // Embedded visualizations
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
  systemSources: true,
  visualizations: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

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

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // file type (pdf, docx, etc.)
  size: integer("size").notNull(), // file size in bytes
  path: text("path").notNull(), // storage path
  content: text("content"), // extracted text content
  metadata: jsonb("metadata").default({}), // extracted metadata
  userId: integer("user_id").references(() => users.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
  status: text("status").default("pending"), // pending, processing, completed, error
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  type: true,
  size: true,
  path: true,
  content: true,
  metadata: true,
  userId: true,
  conversationId: true,
  status: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

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
