import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { configureSalesforceOAuth, getUserAccessLevel } from './salesforce';
import { canUserPerformWrite } from './llm-access';
import { AccessLevel, type AccessLevelType } from '../../shared/schema';

// Schema definitions
const salesforceOAuthInitSchema = z.object({
  accessLevel: z.enum([AccessLevel.READ, AccessLevel.WRITE]).optional()
});

const oauthCallbackSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional()
});

// Create auth router
export const authRouter = Router();

// Express session type augmentation
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    accessLevel?: string;
    requestedAccessLevel?: string;
  }
}

// Extend Express Request to include session properties
// We don't need to redefine the session properties here as they are defined in express-session
// We need to extend the User type for Passport
interface PassportUser {
  id: number;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface User extends PassportUser {}
  }
}

// Initialize Salesforce OAuth flow
authRouter.post('/salesforce', async (req: Request, res: Response) => {
  try {
    // Validate request
    const parsedBody = salesforceOAuthInitSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ 
        error: 'Invalid request format',
        details: parsedBody.error.format()
      });
    }
    
    const { accessLevel = AccessLevel.READ } = parsedBody.data;
    
    // Store the requested access level in session
    req.session.requestedAccessLevel = accessLevel;
    
    // Configure passport strategy with the requested access level
    configureSalesforceOAuth(passport, accessLevel);
    
    // Generate authorization URL
    const authURL = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.SALESFORCE_CALLBACK_URL || 'http://localhost:3001/auth/salesforce/callback')}&scope=${encodeURIComponent('api id refresh_token')}`;
    
    // Return URL to client
    return res.json({ url: authURL });
  } catch (error) {
    console.error('Error initiating Salesforce OAuth:', error);
    return res.status(500).json({ error: 'Failed to initialize Salesforce authentication' });
  }
});

// Salesforce OAuth callback route
authRouter.get('/salesforce/callback', 
  passport.authenticate('salesforce', { session: false, failureRedirect: '/' }),
  (req: Request, res: Response) => {
    try {
      // Validate the callback request
      const parsedQuery = oauthCallbackSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.redirect('/#error=invalid_callback');
      }
      
      // Set user info in session
      if (req.user) {
        req.session.userId = req.user.id;
        req.session.accessLevel = req.session.requestedAccessLevel || AccessLevel.READ;
      }
      
      // Redirect to success page
      return res.redirect('/auth/success');
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      return res.redirect('/#error=oauth_callback_error');
    }
  }
);

// Success redirect after authentication
authRouter.get('/success', async (req: Request, res: Response) => {
  return res.redirect('/');
});

// Get user's current access level
authRouter.get('/access-level', async (req: Request, res: Response) => {
  try {
    console.log('Access level check - Session:', req.session);
    console.log('Access level check - User:', req.user);
    
    const userId = req.session.userId || (req.user ? req.user.id : null);
    
    if (!userId) {
      return res.json({
        isAuthenticated: false,
        accessLevel: AccessLevel.READ,
        provider: null,
        username: null
      });
    }
    
    // For debugging, let's assume the user is authenticated for now (TEMPORARY)
    // In a real app, this would properly fetch from the user's stored profile info
    const accessLevel = AccessLevel.READ; // Demo value
    
    // This is a workaround - in the final app this would get real user information
    return res.json({
      isAuthenticated: true,
      accessLevel,
      provider: 'local',
      username: 'demo_user'
    });
  } catch (error) {
    console.error('Error getting access level:', error);
    return res.status(500).json({ error: 'Failed to get access level information' });
  }
});

/**
 * Middleware to require write access for certain operations
 */
export const requireWriteAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const canWrite = await canUserPerformWrite(userId);
    
    if (!canWrite) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'This operation requires write access'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in write access middleware:', error);
    return res.status(500).json({ error: 'Server error checking permissions' });
  }
};