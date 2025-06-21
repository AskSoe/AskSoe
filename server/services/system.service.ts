import { type System, type InsertSystem } from "../schema";
import { storage } from "../storage";

export interface SystemService {
  getAllSystems(): Promise<System[]>;
  getUserSystems(userId: number): Promise<System[]>;
  getSystem(id: number): Promise<System | undefined>;
  createSystem(system: InsertSystem, userId?: number): Promise<System>;
  updateSystem(id: number, updates: Partial<System>): Promise<System | undefined>;
  deleteSystem(id: number): Promise<boolean>;
  getConnectedSystems(): Promise<System[]>;
}

export class SystemServiceImpl implements SystemService {
  async getAllSystems(): Promise<System[]> {
    return await storage.getSystems();
  }

  async getUserSystems(userId: number): Promise<System[]> {
    return await storage.getUserSystems(userId);
  }

  async getSystem(id: number): Promise<System | undefined> {
    return await storage.getSystem(id);
  }

  async createSystem(system: InsertSystem, userId?: number): Promise<System> {
    return await storage.createSystem(system, userId);
  }

  async updateSystem(id: number, updates: Partial<System>): Promise<System | undefined> {
    return await storage.updateSystem(id, updates);
  }

  async deleteSystem(id: number): Promise<boolean> {
    return await storage.deleteSystem(id);
  }

  async getConnectedSystems(): Promise<System[]> {
    const systems = await storage.getSystems();
    return systems.filter(s => s.status === "connected" || s.status === "limited");
  }
}

export const systemService = new SystemServiceImpl(); 