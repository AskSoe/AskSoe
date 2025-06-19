import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { Express } from "express";
import { Pool } from "pg";

// Memory store for development
const MemoryStore = createMemoryStore(session);

// PostgreSQL session store for production
const PostgresSessionStore = connectPg(session);

/**
 * Creates an in-memory session store for development
 */
export function createMemorySessionStore(): session.Store {
  return new MemoryStore({
    checkPeriod: 86400000 // Clear expired sessions every 24h
  });
}

/**
 * Creates a PostgreSQL session store for production
 */
export function createPgSessionStore(pool: Pool): session.Store {
  return new PostgresSessionStore({
    pool,
    createTableIfMissing: true
  });
}

/**
 * Configures session middleware for the Express app
 */
export function configureSession(app: Express, store: session.Store): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.set("trust proxy", 1);
  
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'none'
    }
  };
  
  app.use(session(sessionOptions));
}

export function setupSession(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
    cookie: {
      secure: !isDevelopment,
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
    rolling: true,
  };
}