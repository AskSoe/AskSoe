import { PassportStatic } from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import { storage } from '../storage';
import { AccessLevel, type AccessLevelType } from '../../shared/schema';
import { Router } from 'express';
import axios from 'axios';

// Salesforce OAuth configuration
// These must be set in environment variables
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const SALESFORCE_CALLBACK_URL = process.env.SALESFORCE_CALLBACK_URL || 'http://localhost:3001/auth/salesforce/callback';

// Validate required environment variables
if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
  console.warn('Salesforce OAuth configuration incomplete. Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables.');
}

// Define scopes based on access level
export const SALESFORCE_SCOPES = {
  [AccessLevel.READ]: [
    'api',
    'id',
    'refresh_token',
    'chatter_api',
    'full'
  ],
  [AccessLevel.WRITE]: [
    'api',
    'id',
    'refresh_token',
    'chatter_api',
    'full',
    'web',
    'content',
    'openid',
    'custom_permissions',
    'wave_api',
    'eclair_api'
  ]
};

/**
 * Configure Passport with Salesforce OAuth2 strategy
 */
export function configureSalesforceOAuth(passport: PassportStatic, accessLevel: AccessLevelType) {
  // Check if required environment variables are set
  if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
    console.warn('Salesforce OAuth not configured. Skipping setup.');
    return;
  }

  const salesforceConfig = {
    authorizationURL: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenURL: 'https://login.salesforce.com/services/oauth2/token',
    clientID: SALESFORCE_CLIENT_ID,
    clientSecret: SALESFORCE_CLIENT_SECRET,
    callbackURL: SALESFORCE_CALLBACK_URL,
    scope: SALESFORCE_SCOPES[accessLevel].join(' ')
  };

  passport.use('salesforce', new OAuth2Strategy(
    salesforceConfig,
    async (accessToken: string, refreshToken: string, profile: any, done: (error: Error | null, user?: any) => void) => {
      try {
        // In a real app, we would validate the token, get user info, etc.
        const userId = 1; // For demo purposes - in real app would be determined from session
        
        // Store or update the OAuth token
        const existingToken = await storage.getOAuthToken(userId, 'salesforce');
        
        if (existingToken) {
          await storage.updateOAuthToken(existingToken.id, {
            accessToken,
            refreshToken,
            scopes: SALESFORCE_SCOPES[accessLevel],
          });
        } else {
          await storage.createOAuthToken({
            userId,
            provider: 'salesforce',
            accessToken,
            refreshToken,
            scopes: SALESFORCE_SCOPES[accessLevel],
          });
        }
        
        // Return success
        return done(null, { id: userId, accessLevel });
      } catch (error) {
        return done(error as Error);
      }
    }
  ));
}

/**
 * Get user's Salesforce token
 */
export async function getSalesforceToken(userId: number): Promise<string | null> {
  try {
    const token = await storage.getOAuthToken(userId, 'salesforce');
    return token?.accessToken || null;
  } catch (error) {
    console.error('Error getting Salesforce token:', error);
    return null;
  }
}

/**
 * Check if user has valid Salesforce access
 */
export async function hasValidSalesforceAccess(userId: number): Promise<boolean> {
  const token = await getSalesforceToken(userId);
  return !!token;
}

/**
 * Get user's access level
 */
export async function getUserAccessLevel(userId: number): Promise<AccessLevelType> {
  try {
    const token = await storage.getOAuthToken(userId, 'salesforce');
    
    // Check if token exists
    if (!token) {
      return AccessLevel.READ;
    }
    
    // Check if token has write scopes
    const scopes = token.scopes || [];
    const hasWriteScope = scopes.some(scope => 
      !SALESFORCE_SCOPES[AccessLevel.READ].includes(scope)
    );
    
    return hasWriteScope ? AccessLevel.WRITE : AccessLevel.READ;
  } catch (error) {
    console.error('Error getting user access level:', error);
    return AccessLevel.READ; // Default to read-only access
  }
}

/**
 * Generate LLM prompt wrapper based on access level
 */
export function getLlmPromptWrapper(accessLevel: AccessLevelType): string {
  if (accessLevel === AccessLevel.READ) {
    return `
You are in READ-ONLY mode. You can only access and retrieve information, but cannot modify, create, or delete any data. 
Do not suggest or imply that you can make changes to the system. 
When asked about actions that require write access, explain that you cannot perform them and suggest contacting an administrator.
    `.trim();
  } else {
    return `
You have FULL ACCESS mode. You can access information as well as suggest changes, including creating, modifying, or deleting records.
When suggesting changes, clearly explain what will happen and request confirmation before proceeding.
    `.trim();
  }
}