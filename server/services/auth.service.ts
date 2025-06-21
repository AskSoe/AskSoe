import { type User } from "../schema";
import { storage } from "../storage";

export interface AuthService {
  getCurrentUser(userId: number): Promise<User | undefined>;
  validateUser(username: string, password: string): Promise<User | undefined>;
  updateUserLastLogin(userId: number): Promise<User | undefined>;
  isUserAdmin(userId: number): Promise<boolean>;
}

export class AuthServiceImpl implements AuthService {
  async getCurrentUser(userId: number): Promise<User | undefined> {
    return await storage.getUser(userId);
  }

  async validateUser(username: string, password: string): Promise<User | undefined> {
    return await storage.loginUser(username, password);
  }

  async updateUserLastLogin(userId: number): Promise<User | undefined> {
    return await storage.updateUser(userId, {
      lastLoginAt: new Date()
    });
  }

  async isUserAdmin(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    return user?.isAdmin || false;
  }
}

export const authService = new AuthServiceImpl(); 