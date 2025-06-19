import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { type User as SchemaUser, type InsertUser, type SubscriptionTierType, type AccessLevelType } from '../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.resolve(__dirname, 'users.json');

// Extend the schema User type with additional fields needed for storage
export interface User extends Omit<SchemaUser, 'createdAt' | 'lastLoginAt' | 'password'> {
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  lastLoginAt: string | null;
  password: string; // Override to make password required and non-null
  profileImage: string | null;
  authProvider: string | null;
  authProviderId: string | null;
  systemsConnected: number;
  isAdmin: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  queryCount: number;
}

export interface CreateUserData extends Omit<InsertUser, 'id' | 'password'> {
  subscriptionTier: SubscriptionTierType;
  accessLevel: AccessLevelType;
  tenantId: string;
  password: string; // Override to make password required and non-null
}

async function readUsers(): Promise<User[]> {
  try {
    console.log('Reading users from:', USERS_FILE);
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(data);
    console.log('Successfully read users:', users.length);
    return users;
  } catch (error) {
    console.error('Error reading users file:', error);
    console.log('Returning empty array as fallback');
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  try {
    console.log('Writing users to:', USERS_FILE);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Successfully wrote', users.length, 'users to file');
  } catch (error) {
    console.error('Error writing users file:', error);
    throw new Error('Could not write users file');
  }
}

export async function getAllUsers(): Promise<User[]> {
  return await readUsers();
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await readUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await readUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export async function getUserById(id: number): Promise<User | undefined> {
  const users = await readUsers();
  return users.find(u => u.id === id);
}

export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });
    const users = await readUsers();
    
    // Prevent writing over an empty file if read failed
    if (!Array.isArray(users)) {
      console.error('User storage is not an array. Current value:', users);
      throw new Error('User storage is corrupted. Refusing to proceed.');
    }
    
    // Check for duplicates
    const existingEmail = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingEmail) {
      throw new Error('Email already exists');
    }
    
    const existingUsername = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingUsername) {
      throw new Error('Username already exists');
    }
    
    console.log('Current users in storage:', users.length);
    
    // Generate new ID
    const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    console.log('Assigning new user ID:', id);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser: User = {
      id,
      username: userData.username,
      password: hashedPassword,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      subscriptionTier: userData.subscriptionTier,
      accessLevel: userData.accessLevel,
      tenantId: userData.tenantId,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      profileImage: null,
      authProvider: null,
      authProviderId: null,
      systemsConnected: 0,
      isAdmin: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      queryCount: 0
    };
    
    console.log('User object to save:', { ...newUser, password: '[HIDDEN]' });
    
    users.push(newUser);
    console.log('About to save', users.length, 'users to file');
    await writeUsers(users);
    
    console.log('User successfully created and saved with ID:', id);
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  try {
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return null;
    }
    
    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    await writeUsers(users);
    
    console.log('User updated successfully:', id);
    return users[userIndex];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    const users = await readUsers();
    const initialLength = users.length;
    const filteredUsers = users.filter(u => u.id !== id);
    
    if (filteredUsers.length === initialLength) {
      return false; // User not found
    }
    
    await writeUsers(filteredUsers);
    console.log('User deleted successfully:', id);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function validateUserLogin(username: string, password: string): Promise<User | null> {
  try {
    const users = await readUsers();
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() || 
      u.email.toLowerCase() === username.toLowerCase()
    );
    
    if (!user || !user.isActive) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }
    
    // Update last login time
    await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    
    return user;
  } catch (error) {
    console.error('Error validating user login:', error);
    return null;
  }
}

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  const users = await readUsers();
  return users.filter(u => u.tenantId === tenantId && u.isActive);
}

export async function isStaffAdmin(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.subscriptionTier === 'staff_admin' && user?.accessLevel === 'admin';
}