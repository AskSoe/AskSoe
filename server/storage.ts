import {
  users, type User, type InsertUser,
  systems, type System, type InsertSystem,
  llmProviders, type LlmProvider, type InsertLlmProvider,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  oauthTokens, type OauthToken, type InsertOauthToken,
  documents, type Document, type InsertDocument,
} from "./schema";
import {
  AccessLevel, SubscriptionTier,
  AuthProvider, type AuthProviderType,
  type AccessLevelType, type SubscriptionTierType, tierLimits
} from "../shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAuthProviderId(providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserAccessLevel(id: number, accessLevel: AccessLevelType): Promise<User | undefined>;
  updateUserSubscription(id: number, tier: SubscriptionTierType): Promise<User | undefined>;
  loginUser(username: string, password: string): Promise<User | undefined>;
  incrementUserSystemCount(id: number): Promise<User | undefined>;
  decrementUserSystemCount(id: number): Promise<User | undefined>;
  incrementUserQueryCount(id: number): Promise<User | undefined>;
  getUsersByAdminStatus(isAdmin: boolean): Promise<User[]>;
  updateUserAdminStatus(id: number, isAdmin: boolean): Promise<User | undefined>;
  updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  getUserCount(): Promise<number>;
  
  // System methods
  getSystems(): Promise<System[]>;
  getUserSystems(userId: number): Promise<System[]>;
  getSystem(id: number): Promise<System | undefined>;
  createSystem(system: InsertSystem, userId?: number): Promise<System>;
  updateSystem(id: number, system: Partial<System>): Promise<System | undefined>;
  deleteSystem(id: number): Promise<boolean>;
  
  // LLM Provider methods
  getLlmProviders(): Promise<LlmProvider[]>;
  getLlmProvider(id: number): Promise<LlmProvider | undefined>;
  getActiveLlmProvider(): Promise<LlmProvider | undefined>;
  createLlmProvider(provider: InsertLlmProvider): Promise<LlmProvider>;
  updateLlmProvider(id: number, provider: Partial<LlmProvider>): Promise<LlmProvider | undefined>;
  setActiveLlmProvider(id: number): Promise<LlmProvider | undefined>;
  
  // Conversation methods
  getConversations(): Promise<Conversation[]>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Message methods
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<Message>): Promise<Message | undefined>;
  
  // OAuth Token methods
  getOAuthToken(userId: number, provider: string): Promise<OauthToken | undefined>;
  createOAuthToken(token: InsertOauthToken): Promise<OauthToken>;
  updateOAuthToken(id: number, token: Partial<OauthToken>): Promise<OauthToken | undefined>;
  deleteOAuthToken(id: number): Promise<boolean>;
  
  // Document methods
  getDocuments(userId?: number): Promise<Document[]>;
  getConversationDocuments(conversationId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  updateDocumentStatus(id: number, status: string): Promise<Document | undefined>;
  updateDocumentContent(id: number, content: string): Promise<Document | undefined>;
  updateDocumentMetadata(id: number, metadata: any): Promise<Document | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private systems: Map<number, System>;
  private llmProviders: Map<number, LlmProvider>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private oauthTokens: Map<number, OauthToken>;
  private documents: Map<number, Document>;
  
  private userId: number;
  private systemId: number;
  private llmProviderId: number;
  private conversationId: number;
  private messageId: number;
  private oauthTokenId: number;
  private documentId: number;

  constructor() {
    this.users = new Map();
    this.systems = new Map();
    this.llmProviders = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.oauthTokens = new Map();
    this.documents = new Map();
    
    this.userId = 1;
    this.systemId = 1;
    this.llmProviderId = 1;
    this.conversationId = 1;
    this.messageId = 1;
    this.oauthTokenId = 1;
    this.documentId = 1;
    
    // Add default systems - we'll handle this synchronously for simplicity
    this.initializeDefaultDataSync();
  }
  
  // Synchronous version of initialization for use in constructor
  private initializeDefaultDataSync() {
    // Create your user account with Staff Admin access
    this.createUser({
      username: "dangshaw@gmail.com",
      password: this.hashPassword("Password"),
      accessLevel: AccessLevel.ADMIN,
      email: "dangshaw@gmail.com",
      subscriptionTier: SubscriptionTier.STAFF_ADMIN,
      isAdmin: true
    });

    // Create Simon's user account with his real credentials
    this.createUser({
      username: "Simonhinde10@gmail.com",
      password: this.hashPassword("Test"),
      accessLevel: AccessLevel.WRITE,
      email: "Simonhinde10@gmail.com",
      subscriptionTier: SubscriptionTier.ENTERPRISE,
      isAdmin: false  // Regular user - NO admin access
    });

    
    // Add some default systems
    this.createSystem({
      name: "Salesforce CRM",
      type: "crm",
      connectionDetails: {
        apiUrl: "https://api.salesforce.com",
        apiVersion: "v56.0"
      },
      status: "connected"
    });
    
    this.createSystem({
      name: "SAP ERP",
      type: "erp",
      connectionDetails: {
        apiUrl: "https://api.sap.com",
        apiVersion: "v2"
      },
      status: "connected"
    });
    
    this.createSystem({
      name: "Tableau",
      type: "visualization",
      connectionDetails: {
        apiUrl: "https://api.tableau.com",
        apiVersion: "v1"
      },
      status: "limited"
    });
    
    // Create default LLM Providers
    this.createLlmProvider({
      name: "Azure OpenAI (GPT-4)",
      type: "azure",
      apiKey: null,
      settings: {
        model: "gpt-4o",
        temperature: 0.7
      },
      isActive: false
    });
    
    this.createLlmProvider({
      name: "Anthropic Claude",
      type: "anthropic",
      apiKey: null,
      settings: {
        model: "claude-3-opus",
        temperature: 0.7
      },
      isActive: false
    });
    
    this.createLlmProvider({
      name: "OpenAI API",
      type: "openai",
      apiKey: null,
      settings: {
        model: "gpt-4o",
        temperature: 0.7
      },
      isActive: false
    });
    
    // Create initial conversation
    const conversation: Conversation = {
      id: this.conversationId++,
      title: "Customer Retention Analysis",
      userId: 1, 
      createdAt: new Date()
    };
    this.conversations.set(conversation.id, conversation);
    
    // Create initial message
    const message: Message = {
      id: this.messageId++,
      conversationId: conversation.id,
      content: "Welcome to the AI Integration Hub! How can I help you analyze your customer data?",
      role: "assistant",
      timestamp: new Date(),
      systemSources: [],
      visualizations: []
    };
    this.messages.set(message.id, message);
  }
  
  private hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
  
  private verifyPassword(password: string, hash: string | null): boolean {
    if (!hash) return false;
    return bcrypt.compareSync(password, hash);
  }
  
  // User Methods
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByAuthProviderId(providerId: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.authProviderId === providerId) {
        return user;
      }
    }
    return undefined;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password || null,
      email: insertUser.email,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImage: insertUser.profileImage || null,
      authProvider: insertUser.authProvider || AuthProvider.LOCAL,
      authProviderId: insertUser.authProviderId || null,
      accessLevel: insertUser.accessLevel || AccessLevel.READ,
      subscriptionTier: insertUser.subscriptionTier || SubscriptionTier.FREE,
      systemsConnected: 0,
      isAdmin: insertUser.isAdmin || false,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      queryCount: 0,
      createdAt: new Date(),
      lastLoginAt: null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserAccessLevel(id: number, accessLevel: AccessLevelType): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { ...user, accessLevel };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserSubscription(id: number, tier: SubscriptionTierType): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      subscriptionTier: tier, 
      accessLevel: tierLimits[tier].canWrite ? AccessLevel.WRITE : AccessLevel.READ
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async loginUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user || !this.verifyPassword(password, user.password)) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      lastLoginAt: new Date() 
    };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }
  
  async incrementUserSystemCount(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      systemsConnected: (user.systemsConnected || 0) + 1 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async decrementUserSystemCount(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      systemsConnected: Math.max(0, (user.systemsConnected || 0) - 1)
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async incrementUserQueryCount(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      queryCount: (user.queryCount || 0) + 1 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByAdminStatus(isAdmin: boolean): Promise<User[]> {
    const result: User[] = [];
    for (const user of this.users.values()) {
      if (user.isAdmin === isAdmin) {
        result.push(user);
      }
    }
    return result;
  }

  async updateUserAdminStatus(id: number, isAdmin: boolean): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { ...user, isAdmin };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.stripeCustomerId === stripeCustomerId) {
        return user;
      }
    }
    return undefined;
  }
  
  // OAuth Token Methods
  
  async getOAuthToken(userId: number, provider: string): Promise<OauthToken | undefined> {
    for (const token of this.oauthTokens.values()) {
      if (token.userId === userId && token.provider === provider) {
        return token;
      }
    }
    return undefined;
  }
  
  async createOAuthToken(insertToken: InsertOauthToken): Promise<OauthToken> {
    const id = this.oauthTokenId++;
    
    const token: OauthToken = {
      id,
      userId: insertToken.userId,
      provider: insertToken.provider,
      accessToken: insertToken.accessToken,
      refreshToken: insertToken.refreshToken || null,
      expiresAt: insertToken.expiresAt || null,
      scopes: insertToken.scopes || [],
      tokenData: insertToken.tokenData || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.oauthTokens.set(id, token);
    return token;
  }
  
  async updateOAuthToken(id: number, update: Partial<OauthToken>): Promise<OauthToken | undefined> {
    const token = this.oauthTokens.get(id);
    if (!token) {
      return undefined;
    }
    
    const updatedToken: OauthToken = { 
      ...token, 
      ...update, 
      updatedAt: new Date() 
    };
    this.oauthTokens.set(id, updatedToken);
    return updatedToken;
  }
  
  async deleteOAuthToken(id: number): Promise<boolean> {
    return this.oauthTokens.delete(id);
  }
  
  // System Methods
  
  async getSystems(): Promise<System[]> {
    return Array.from(this.systems.values());
  }
  
  async getUserSystems(userId: number): Promise<System[]> {
    // In a real implementation, we would filter based on a relation
    // For simplicity, we're returning all systems
    return this.getSystems();
  }
  
  async getSystem(id: number): Promise<System | undefined> {
    return this.systems.get(id);
  }
  
  async createSystem(insertSystem: InsertSystem, userId?: number): Promise<System> {
    const id = this.systemId++;
    
    const system: System = {
      id,
      name: insertSystem.name,
      type: insertSystem.type,
      connectionDetails: insertSystem.connectionDetails,
      status: insertSystem.status || "connected",
      lastSynced: new Date()
    };
    
    this.systems.set(id, system);
    
    // Increment user system count if userId is provided
    if (userId) {
      await this.incrementUserSystemCount(userId);
    }
    
    return system;
  }
  
  async updateSystem(id: number, update: Partial<System>): Promise<System | undefined> {
    const system = this.systems.get(id);
    if (!system) {
      return undefined;
    }
    
    const updatedSystem: System = { ...system, ...update };
    this.systems.set(id, updatedSystem);
    return updatedSystem;
  }
  
  async deleteSystem(id: number): Promise<boolean> {
    return this.systems.delete(id);
  }
  
  // LLM Provider Methods
  
  async getLlmProviders(): Promise<LlmProvider[]> {
    return Array.from(this.llmProviders.values());
  }
  
  async getLlmProvider(id: number): Promise<LlmProvider | undefined> {
    return this.llmProviders.get(id);
  }
  
  async getActiveLlmProvider(): Promise<LlmProvider | undefined> {
    for (const provider of this.llmProviders.values()) {
      if (provider.isActive) {
        return provider;
      }
    }
    return undefined;
  }
  
  async createLlmProvider(insertProvider: InsertLlmProvider): Promise<LlmProvider> {
    const id = this.llmProviderId++;
    
    const provider: LlmProvider = {
      id,
      name: insertProvider.name,
      type: insertProvider.type,
      apiKey: insertProvider.apiKey,
      settings: insertProvider.settings || {},
      isActive: insertProvider.isActive || false
    };
    
    this.llmProviders.set(id, provider);
    return provider;
  }
  
  async updateLlmProvider(id: number, update: Partial<LlmProvider>): Promise<LlmProvider | undefined> {
    const provider = this.llmProviders.get(id);
    if (!provider) {
      return undefined;
    }
    
    const updatedProvider: LlmProvider = { ...provider, ...update };
    this.llmProviders.set(id, updatedProvider);
    return updatedProvider;
  }
  
  async setActiveLlmProvider(id: number): Promise<LlmProvider | undefined> {
    const provider = this.llmProviders.get(id);
    if (!provider) {
      return undefined;
    }
    
    // Set all providers to inactive
    for (const [providerId, currentProvider] of this.llmProviders.entries()) {
      if (currentProvider.isActive) {
        const inactiveProvider = { ...currentProvider, isActive: false };
        this.llmProviders.set(providerId, inactiveProvider);
      }
    }
    
    // Set the selected provider to active
    const updatedProvider: LlmProvider = { ...provider, isActive: true };
    this.llmProviders.set(id, updatedProvider);
    return updatedProvider;
  }
  
  // Conversation Methods
  
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }
  
  async getUserConversations(userId: number): Promise<Conversation[]> {
    const result: Conversation[] = [];
    for (const conversation of this.conversations.values()) {
      if (conversation.userId === userId) {
        result.push(conversation);
      }
    }
    return result;
  }
  
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    
    const conversation: Conversation = {
      id,
      title: insertConversation.title,
      userId: insertConversation.userId || null,
      createdAt: new Date()
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async updateConversation(id: number, update: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      return undefined;
    }
    
    const updatedConversation: Conversation = { ...conversation, ...update };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteConversation(id: number): Promise<boolean> {
    // Delete associated messages first
    for (const [messageId, message] of this.messages.entries()) {
      if (message.conversationId === id) {
        this.messages.delete(messageId);
      }
    }
    
    return this.conversations.delete(id);
  }
  
  // Message Methods
  
  async getMessages(conversationId: number): Promise<Message[]> {
    console.log(`Fetching messages for conversation ID: ${conversationId}`);
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      console.log(`Conversation with ID ${conversationId} not found`);
      return [];
    }
    
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (message.conversationId === conversationId) {
        result.push(message);
      }
    }
    
    console.log(`Retrieved ${result.length} messages for conversation ID: ${conversationId}`);
    return result;
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    
    const message: Message = {
      id,
      conversationId: insertMessage.conversationId,
      content: insertMessage.content,
      role: insertMessage.role,
      timestamp: new Date(),
      systemSources: insertMessage.systemSources || [],
      visualizations: insertMessage.visualizations || []
    };
    
    this.messages.set(id, message);
    return message;
  }
  
  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) {
      return undefined;
    }
    
    const updatedMessage: Message = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  // Document Methods
  
  async getDocuments(userId?: number): Promise<Document[]> {
    if (userId) {
      const result: Document[] = [];
      for (const document of this.documents.values()) {
        if (document.userId === userId) {
          result.push(document);
        }
      }
      return result;
    }
    return Array.from(this.documents.values());
  }
  
  async getConversationDocuments(conversationId: number): Promise<Document[]> {
    const result: Document[] = [];
    for (const document of this.documents.values()) {
      if (document.conversationId === conversationId) {
        result.push(document);
      }
    }
    return result;
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    
    const document: Document = {
      id,
      name: insertDocument.name,
      type: insertDocument.type,
      size: insertDocument.size,
      path: insertDocument.path,
      content: insertDocument.content || null,
      metadata: insertDocument.metadata || {},
      userId: insertDocument.userId || null,
      conversationId: insertDocument.conversationId || null,
      createdAt: new Date(),
      analyzedAt: null,
      status: insertDocument.status || "pending"
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const updatedDocument: Document = { ...document, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  async updateDocumentStatus(id: number, status: string): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const updatedDocument: Document = { ...document, status };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async updateDocumentContent(id: number, content: string): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const updatedDocument: Document = { 
      ...document, 
      content, 
      status: "completed", 
      analyzedAt: new Date() 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async updateDocumentMetadata(id: number, metadata: any): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) {
      return undefined;
    }
    
    const updatedDocument: Document = { 
      ...document, 
      metadata: { ...document.metadata, ...metadata } 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => 
      (user.tenantId || 'default') === tenantId
    );
  }

  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
}

export const storage = new MemStorage();