import { type LlmProvider, type InsertLlmProvider } from "../schema";
import { storage } from "../storage";

export interface LlmService {
  getAllProviders(): Promise<LlmProvider[]>;
  getProvider(id: number): Promise<LlmProvider | undefined>;
  getActiveProvider(): Promise<LlmProvider | undefined>;
  createProvider(provider: InsertLlmProvider): Promise<LlmProvider>;
  updateProvider(id: number, updates: Partial<LlmProvider>): Promise<LlmProvider | undefined>;
  setActiveProvider(id: number): Promise<LlmProvider | undefined>;
  isProviderActive(id: number): Promise<boolean>;
}

export class LlmServiceImpl implements LlmService {
  async getAllProviders(): Promise<LlmProvider[]> {
    return await storage.getLlmProviders();
  }

  async getProvider(id: number): Promise<LlmProvider | undefined> {
    return await storage.getLlmProvider(id);
  }

  async getActiveProvider(): Promise<LlmProvider | undefined> {
    return await storage.getActiveLlmProvider();
  }

  async createProvider(provider: InsertLlmProvider): Promise<LlmProvider> {
    return await storage.createLlmProvider(provider);
  }

  async updateProvider(id: number, updates: Partial<LlmProvider>): Promise<LlmProvider | undefined> {
    return await storage.updateLlmProvider(id, updates);
  }

  async setActiveProvider(id: number): Promise<LlmProvider | undefined> {
    return await storage.setActiveLlmProvider(id);
  }

  async isProviderActive(id: number): Promise<boolean> {
    const provider = await storage.getLlmProvider(id);
    return provider?.isActive || false;
  }
}

export const llmService = new LlmServiceImpl(); 