import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import passport from "passport";
import Stripe from "stripe";

import { authRouter } from "./auth.routes";
import { systemsRouter } from "./systems.routes";
import { llmRouter } from "./llm.routes";
import { chatRouter } from "./chat.routes";
import { subscriptionRouter } from "./subscription.routes";
import { adminRouter } from "../admin-routes";
import salesforceAuth from "../salesforce-auth";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Import and setup authentication system
  const { setupAuth } = await import("../auth");
  setupAuth(app);

  // Create API router
  const apiRouter = express.Router();

  // Mount route modules
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/systems", systemsRouter);
  apiRouter.use("/llm-providers", llmRouter);
  apiRouter.use("/chat", chatRouter);
  apiRouter.use("/subscription", subscriptionRouter);
  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/salesforce", salesforceAuth);

  // Health check endpoint for Railway
  apiRouter.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server });

  // WebSocket connection handling
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established");

    // Set up heartbeat
    ws.on("pong", heartbeat);

    // Handle incoming messages
    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("Received WebSocket message:", message);

        // Handle different message types
        switch (message.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    // Handle connection close
    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });

    // Send connection established message
    ws.send(JSON.stringify({
      type: "connection_established",
      payload: {
        message: "Connected to SOE WebSocket server",
        timestamp: new Date().toISOString()
      }
    }));
  });

  // Broadcast message to all connected clients
  const broadcastMessage = (type: string, payload: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload }));
      }
    });
  };

  // Heartbeat function
  function heartbeat(this: WebSocket) {
    (this as any).isAlive = true;
  }

  // Set up heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clean up on server close
  wss.on("close", () => {
    clearInterval(interval);
  });

  return server;
} 