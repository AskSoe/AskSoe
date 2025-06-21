import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { validateUserLogin, getUserById } from "./user-storage";
import { type User as SchemaUser } from "./schema";
import { type AccessLevelType, type SubscriptionTierType, AccessLevel, SubscriptionTier } from "../shared/schema";
import createMemoryStore from "memorystore";
import express from 'express';
import { type User as StorageUser, type CreateUserData } from './user-storage';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Extend Express's User type to include our schema properties
declare global {
  namespace Express {
    interface User extends Omit<StorageUser, 'password'> {}
  }
}

declare module 'express-session' {
  interface SessionData {
    user: Omit<StorageUser, 'password'>;
  }
}

const MemoryStore = createMemoryStore(session);

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  // Session configuration with 30-minute persistence
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours cleanup interval
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
    },
    rolling: true, // Reset expiration on activity
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local authentication strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username', // Can be email or username
        passwordField: 'password'
      },
      async (username, password, done) => {
        try {
          console.log('Local strategy - authenticating user:', username);
          const user = await validateUserLogin(username, password);
          
          if (!user) {
            console.log('Local strategy - authentication failed for:', username);
            return done(null, false, { message: 'Invalid credentials' });
          }
          
          console.log('Local strategy - authentication successful for:', user.id, user.email);
          return done(null, user);
        } catch (error) {
          console.error('Local strategy - authentication error:', error);
          return done(error, false);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id, user.email);
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUserById(id);
      if (!user) {
        return done(null, false);
      }
      // Remove password before passing to session
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData: CreateUserData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        subscriptionTier: SubscriptionTier.FREE,
        accessLevel: AccessLevel.READ,
        tenantId: req.body.tenantId || 'default'
      };

      const { createUser } = await import('./user-storage');
      const user = await createUser(userData);

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ error: "Failed to log in after registration" });
        }
        res.json({ message: "Registration successful" });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt for:', req.body.username);
    
    passport.authenticate("local", (err: any, user: StorageUser | false, info: any) => {
      if (err) {
        console.error('Login authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed - invalid credentials for:', req.body.username);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return next(err);
        }
        
        console.log('Login successful for user:', user.id, user.email);
        
        // Return safe user data
        const safeUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          accessLevel: user.accessLevel,
          provider: 'local'
        };
        
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log('Logout request for user:', userId);
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: "Logout failed" });
        }
        
        res.clearCookie('connect.sid');
        console.log('Logout successful for user:', userId);
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('User status check - authenticated:', req.isAuthenticated(), 'user:', req.user?.id);
    
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return safe user data
    const user = req.user as StorageUser;
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionTier: user.subscriptionTier,
      accessLevel: user.accessLevel,
      provider: 'local'
    };
    
    res.json(safeUser);
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
}