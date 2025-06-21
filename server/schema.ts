import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import types from shared schema
import { 
  AccessLevel, 
  SubscriptionTier, 
  AuthProvider,
  DocumentType 
} from "../shared/schema";

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