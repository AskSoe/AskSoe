import { type Conversation, type InsertConversation, type Message, type InsertMessage } from "../../shared/schema";
import { storage } from "../storage";
import { handleMessage } from "../adapters/llm";

export interface ChatService {
  getAllConversations(): Promise<Conversation[]>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined>;
  processUserMessage(content: string, conversationId?: number, userId?: number): Promise<{
    conversation: Conversation;
    userMessage: Message;
    assistantMessage: Message;
  }>;
}

export class ChatServiceImpl implements ChatService {
  async getAllConversations(): Promise<Conversation[]> {
    return await storage.getConversations();
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return await storage.getUserConversations(userId);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return await storage.getConversation(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    return await storage.createConversation(conversation);
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    return await storage.updateConversation(id, updates);
  }

  async deleteConversation(id: number): Promise<boolean> {
    return await storage.deleteConversation(id);
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await storage.getMessages(conversationId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return await storage.createMessage(message);
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    return await storage.updateMessage(id, updates);
  }

  async processUserMessage(content: string, conversationId?: number, userId?: number): Promise<{
    conversation: Conversation;
    userMessage: Message;
    assistantMessage: Message;
  }> {
    // Create or get conversation
    let conversation;
    if (conversationId) {
      conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }
    } else {
      conversation = await storage.createConversation({
        title: content.substring(0, 50) + "...",
        userId: userId,
      });
    }

    // Create user message
    const userMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: content,
      role: "user",
      systemSources: [],
    });

    // Create processing message
    const processingMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: "Processing...",
      role: "assistant",
      systemSources: [],
    });

    // Handle the message using the LLM adapter
    await handleMessage(userMessage, processingMessage, conversation.id);

    // Get the updated messages
    const messages = await storage.getMessages(conversation.id);
    const updatedUserMessage = messages.find(m => m.id === userMessage.id)!;
    const updatedAssistantMessage = messages.find(m => m.id === processingMessage.id)!;

    return {
      conversation,
      userMessage: updatedUserMessage,
      assistantMessage: updatedAssistantMessage,
    };
  }
}

export const chatService = new ChatServiceImpl(); 