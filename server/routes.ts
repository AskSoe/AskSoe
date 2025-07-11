import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import passport from "passport";
import Stripe from "stripe";
import { storage } from "./storage";
import {
  messageRequestSchema,
  systemConnectionRequestSchema,
  llmProviderRequestSchema,
  documentUploadRequestSchema,
  SubscriptionTier,
  tierLimits,
  type User,
  type System,
  type Message,
  type Conversation,
  type LlmProvider,
  type Document,
  type SubscriptionTierType,
  insertSignupSchema
} from "../shared/schema";

import { handleMessage, tryDirectMockResponse } from "./adapters/llm";
import { authRouter, requireWriteAccess } from "./auth/routes";
import { adminRouter } from "./admin-routes";
import { wrapPromptWithAccessControl } from "./auth/llm-access";
import { testOpenAIDirectly, testOpenAIWithProvider } from "./test-openai";
import {
  isOpenAIAvailable,
  processMessageWithOpenAI,
  ChatMessage,
  getChatResponse,
} from "./adapters/openai";

import salesforceAuth from "./salesforce-auth";
import nodemailer from "nodemailer";

// Initialize Stripe client
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
//   apiVersion: "2025-02-24.acacia",
// });

export async function registerRoutes(app: Express): Promise<Server> {
  // Import and setup authentication system
  const { setupAuth } = await import("./auth");
  setupAuth(app);

  // Create API router
  const apiRouter = express.Router();

  // Mount admin routes
  apiRouter.use("/admin", adminRouter);

  // Add the /api/user route to match frontend expectations
  apiRouter.get("/user", async (req, res) => {
    // For now, check if we have a user session from login
    if (req.user) {
      return res.json(req.user);
    }

    // If no session, check if authenticated via other means
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json(req.user);
    }

    return res.status(401).json({ error: "Not authenticated" });
  });

  // Systems routes
  apiRouter.get("/systems", async (req: Request, res: Response) => {
    try {
      const systems = await storage.getSystems();
      res.json(systems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch systems" });
    }
  });

  apiRouter.get("/systems/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const system = await storage.getSystem(id);

      if (!system) {
        return res.status(404).json({ error: "System not found" });
      }

      res.json(system);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system" });
    }
  });

  apiRouter.post("/systems", async (req: Request, res: Response) => {
    try {
      const result = systemConnectionRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid system data", details: result.error });
      }

      const system = await storage.createSystem({
        name: result.data.name,
        type: result.data.type,
        connectionDetails: result.data.connectionDetails,
        status: "connected",
      });

      res.status(201).json(system);
    } catch (error) {
      res.status(500).json({ error: "Failed to create system" });
    }
  });

  apiRouter.put("/systems/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = systemConnectionRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid system data", details: result.error });
      }

      const updatedSystem = await storage.updateSystem(id, {
        name: result.data.name,
        type: result.data.type,
        connectionDetails: result.data.connectionDetails,
        lastSynced: new Date(),
      });

      if (!updatedSystem) {
        return res.status(404).json({ error: "System not found" });
      }

      res.json(updatedSystem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update system" });
    }
  });

  apiRouter.delete("/systems/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSystem(id);

      if (!success) {
        return res.status(404).json({ error: "System not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete system" });
    }
  });

  // LLM Provider routes
  apiRouter.get("/llm-providers", async (req: Request, res: Response) => {
    try {
      const providers = await storage.getLlmProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch LLM providers" });
    }
  });

  apiRouter.get(
    "/llm-providers/active",
    async (req: Request, res: Response) => {
      try {
        const provider = await storage.getActiveLlmProvider();

        if (!provider) {
          return res
            .status(404)
            .json({ error: "No active LLM provider found" });
        }

        res.json(provider);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch active LLM provider" });
      }
    },
  );

  apiRouter.post("/llm-providers", async (req: Request, res: Response) => {
    try {
      const result = llmProviderRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid LLM provider data", details: result.error });
      }

      const provider = await storage.createLlmProvider({
        name: result.data.name,
        type: result.data.type,
        apiKey: result.data.apiKey,
        settings: result.data.settings || {},
        isActive: result.data.isActive || false,
      });

      res.status(201).json(provider);
    } catch (error) {
      res.status(500).json({ error: "Failed to create LLM provider" });
    }
  });

  apiRouter.put("/llm-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = llmProviderRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid LLM provider data", details: result.error });
      }

      const updatedProvider = await storage.updateLlmProvider(id, {
        name: result.data.name,
        type: result.data.type,
        apiKey: result.data.apiKey,
        settings: result.data.settings,
        isActive: result.data.isActive,
      });

      if (!updatedProvider) {
        return res.status(404).json({ error: "LLM provider not found" });
      }

      res.json(updatedProvider);
    } catch (error) {
      res.status(500).json({ error: "Failed to update LLM provider" });
    }
  });

  apiRouter.post(
    "/llm-providers/:id/activate",
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const provider = await storage.setActiveLlmProvider(id);

        if (!provider) {
          return res.status(404).json({ error: "LLM provider not found" });
        }

        res.json(provider);
      } catch (error) {
        res.status(500).json({ error: "Failed to activate LLM provider" });
      }
    },
  );

  // Conversations routes
  apiRouter.get("/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  apiRouter.get("/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  apiRouter.post("/conversations", async (req: Request, res: Response) => {
    try {
      const { title, userId } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const conversation = await storage.createConversation({
        title,
        userId: userId || null,
      });

      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  apiRouter.put("/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const updatedConversation = await storage.updateConversation(id, {
        title,
      });

      if (!updatedConversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(updatedConversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  apiRouter.delete(
    "/conversations/:id",
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteConversation(id);

        if (!success) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete conversation" });
      }
    },
  );

  // Messages routes - improved with better error handling and logging
  apiRouter.get(
    "/conversations/:conversationId/messages",
    async (req: Request, res: Response) => {
      try {
        const conversationId = parseInt(req.params.conversationId);
        console.log(`Fetching messages for conversation ID: ${conversationId}`);

        // Check first if the conversation exists
        const conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          console.log(`Conversation with ID ${conversationId} not found`);
          return res.status(404).json({ error: "Conversation not found" });
        }

        // Fetch messages for this conversation
        const messages = await storage.getMessages(conversationId);
        console.log(
          `Retrieved ${messages.length} messages for conversation ID: ${conversationId}`,
        );

        // Return sorted messages (oldest first)
        res.json(
          messages.sort(
            (a, b) =>
              new Date(a.timestamp || 0).getTime() -
              new Date(b.timestamp || 0).getTime(),
          ),
        );
      } catch (error) {
        console.error(
          `Error fetching messages for conversation ${req.params.conversationId}:`,
          error,
        );
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    },
  );

  apiRouter.post("/messages", async (req: Request, res: Response) => {
    try {
      const result = messageRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid message data", details: result.error });
      }

      let { conversationId, content } = result.data;

      // If no conversation ID provided, create a new conversation
      if (!conversationId) {
        // Generate title from first ~50 chars of message
        const title =
          content.length > 50 ? content.substring(0, 47) + "..." : content;

        const newConversation = await storage.createConversation({
          title,
          userId: null, // TODO: Use actual user ID if authentication is implemented
        });

        conversationId = newConversation.id;
      }

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        role: "user",
        systemSources: [],
        visualizations: [],
      });

      // Create placeholder response message
      const processingMessage = await storage.createMessage({
        conversationId,
        content: "Processing...",
        role: "assistant",
        systemSources: [],
        visualizations: [],
      });

      // Return both messages
      res.status(201).json({
        userMessage,
        processingMessage,
        conversationId,
      });

      // Get systems to use in response
      const systems = await storage.getSystems();
      const connectedSystems = systems.filter(
        (s) => s.status === "connected" || s.status === "limited",
      );

      // CRUCIAL CHANGE: Use a promise to handle the response update asynchronously
      // but with proper error handling that's guaranteed to complete
      (async () => {
        try {
          // Send typing indicator
          try {
            const express = (global as any).expressApp;
            if (express && express.broadcastWebSocketMessage) {
              express.broadcastWebSocketMessage("assistant_typing", {
                conversationId,
                isTyping: true,
                timestamp: Date.now(),
              });
            }
          } catch (err) {
            console.error("Error sending typing indicator:", err);
            // Non-critical error, continue
          }

          // Wait for a realistic typing delay
          await new Promise((resolve) => setTimeout(resolve, 1200));

          // Generate mock response based on content keywords
          let response =
            "I've analyzed your request and I'm retrieving information from our connected enterprise systems. ";

          // Simple keyword matching for demo responses
          const normalizedContent = content.toLowerCase();

          if (
            normalizedContent.includes("sales") ||
            normalizedContent.includes("revenue")
          ) {
            response +=
              "Based on our sales data, we're seeing a 15% increase in revenue compared to last quarter. The top-performing product categories are enterprise solutions and managed services.";
          } else if (
            normalizedContent.includes("customer") ||
            normalizedContent.includes("retention")
          ) {
            response +=
              "Our customer retention rate is currently at 87%, which is 3% higher than industry average. The most successful retention strategies have been our loyalty program and personalized outreach campaigns.";
          } else if (
            normalizedContent.includes("pipeline") ||
            normalizedContent.includes("forecast")
          ) {
            response +=
              "The current sales pipeline shows $3.2M in qualified opportunities, with an expected close rate of 32% based on historical data. The forecast for Q2 is trending upward with a projected 8% growth.";
          } else {
            response +=
              "I don't have specific data on this particular query in our systems. Could you provide more details about what business metrics or information you're interested in?";
          }

          // Update the processing message with our generated response
          await storage.updateMessage(processingMessage.id, {
            content: response,
            systemSources: connectedSystems.map((s) => s.name),
          });

          // Send notification about message update
          try {
            const express = (global as any).expressApp;
            if (express && express.broadcastWebSocketMessage) {
              express.broadcastWebSocketMessage("message_updated", {
                messageId: processingMessage.id,
                conversationId,
                content: response,
                systemSources: connectedSystems.map((s) => s.name),
                timestamp: new Date().toISOString(),
              });

              // Stop typing indicator
              express.broadcastWebSocketMessage("assistant_typing", {
                conversationId,
                isTyping: false,
                timestamp: Date.now(),
              });
            }
          } catch (err) {
            console.error("Error sending WebSocket notification:", err);
            // Non-critical error, response was still updated in DB
          }

          console.log("Successfully updated message with response");
        } catch (asyncError) {
          console.error("Error in message processing:", asyncError);

          // Guaranteed fallback - directly update with generic response
          try {
            const fallbackResponse =
              "I've received your request and am analyzing the data. Based on the information in our connected systems, I can provide insights once you specify which business metrics you're interested in.";

            await storage.updateMessage(processingMessage.id, {
              content: fallbackResponse,
              systemSources: ["System"],
            });

            // Attempt to broadcast update
            try {
              const express = (global as any).expressApp;
              if (express && express.broadcastWebSocketMessage) {
                express.broadcastWebSocketMessage("message_updated", {
                  messageId: processingMessage.id,
                  conversationId,
                  content: fallbackResponse,
                  systemSources: ["System"],
                  timestamp: new Date().toISOString(),
                });

                // Stop typing indicator
                express.broadcastWebSocketMessage("assistant_typing", {
                  conversationId,
                  isTyping: false,
                  timestamp: Date.now(),
                });
              }
            } catch (wsError) {
              console.error("Error broadcasting WebSocket message:", wsError);
              // Non-critical, storage was already updated
            }
          } catch (finalError) {
            console.error("Critical error - failed all fallbacks:", finalError);
          }
        }
      })();
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Debug route for direct message testing
  // Test endpoint for OpenAI API connection
  apiRouter.get("/test-openai", async (req: Request, res: Response) => {
    try {
      // Test direct and provider-based API calls
      const directResult = await testOpenAIDirectly();
      const providerResult = await testOpenAIWithProvider();

      res.json({
        success: true,
        results: {
          directTest: directResult,
          providerTest: providerResult,
        },
      });
    } catch (error: any) {
      console.error("Error testing OpenAI:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Simple, reliable endpoint for direct chat with OpenAI
  apiRouter.post("/ask", async (req: Request, res: Response) => {
    // Get user prompt from request body
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Check if OpenAI API key is available
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    console.log(`OpenAI API key available: ${OPENAI_API_KEY ? "Yes" : "No"}`);

    try {
      // Get systems to provide context
      const systems = await storage.getSystems();
      const connectedSystems = systems.filter(
        (s) => s.status === "connected" || s.status === "limited",
      );

      // Create or get conversation ID
      let conversationId = req.body.conversationId;

      if (!conversationId) {
        // Generate title from the first ~50 chars of message
        const title =
          prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;

        const newConversation = await storage.createConversation({
          title,
          userId: req.user?.id || null,
        });

        conversationId = newConversation.id;
        console.log(
          `Ask endpoint: Created new conversation with ID ${conversationId}`,
        );
      }

      // Save the user message
      const userMessage = await storage.createMessage({
        conversationId,
        content: prompt,
        role: "user",
        systemSources: [],
        visualizations: [],
      });
      console.log(
        `Ask endpoint: Created user message with ID ${userMessage.id}`,
      );

      // Create a temporary processing message that will be updated with the response
      const processingMessage = await storage.createMessage({
        conversationId,
        content: "Processing your request...",
        role: "assistant",
        systemSources: [],
        visualizations: [],
      });
      console.log(
        `Ask endpoint: Created processing message with ID ${processingMessage.id}`,
      );

      // Build context from connected systems
      const systemContext =
        connectedSystems.length > 0
          ? `You are SOE, a helpful assistant connected to enterprise systems. You have access to: ${connectedSystems.map((s) => s.name).join(", ")}. Provide information based on these systems when relevant.`
          : "You are SOE, a helpful enterprise assistant.";

      // Get conversation history
      let messages = [];

      try {
        // Get previous messages from the same conversation for context
        if (conversationId) {
          const previousMessages = await storage.getMessages(conversationId);
          // Filter out the processing message and current user message
          messages = previousMessages
            .filter(
              (m) => m.id !== processingMessage.id && m.id !== userMessage.id,
            )
            // Limit to the 10 most recent messages for context
            .slice(-10)
            .map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            }));
        }

        // Add system context at the beginning
        messages.unshift({ role: "system", content: systemContext });

        // Add current user message at the end
        messages.push({ role: "user", content: prompt });

        console.log(
          `Ask endpoint: Prepared ${messages.length} messages for the request`,
        );

        let responseContent = "";

        if (OPENAI_API_KEY) {
          try {
            // Import node-fetch
            const fetch = require("node-fetch");

            console.log("Making direct request to OpenAI API");
            const openaiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "gpt-4", // Changed from gpt-4o to improve compatibility
                  messages: messages,
                  temperature: 0.7,
                }),
              },
            );

            // Check if the response is successful
            if (!openaiResponse.ok) {
              const errorData = await openaiResponse.json().catch(() => null);
              console.error("OpenAI API error response:", errorData);
              throw new Error(
                `OpenAI API responded with status ${openaiResponse.status}: ${errorData?.error?.message || "Unknown error"}`,
              );
            }

            // Parse the response
            const data = await openaiResponse.json();
            console.log("OpenAI response received successfully");

            // Extract the response content
            responseContent =
              data.choices[0]?.message?.content || "No response from API";
          } catch (error: any) {
            console.error("Error calling OpenAI API:", error.message);
            // Fall back to mock response
            responseContent = generateMockResponse(prompt, connectedSystems);
          }
        } else {
          console.log("No OpenAI API key available, using mock response");
          responseContent = generateMockResponse(prompt, connectedSystems);
        }

        console.log(
          `Ask endpoint: Received response content of length ${responseContent.length}`,
        );

        // Update the message with the final response
        await storage.updateMessage(processingMessage.id, {
          content: responseContent,
          systemSources: connectedSystems.map((s) => s.name),
        });

        console.log(
          `Ask endpoint: Updated message ${processingMessage.id} with response`,
        );

        // Send WebSocket notification about the message update
        try {
          const express = (global as any).expressApp;
          if (express && express.broadcastWebSocketMessage) {
            express.broadcastWebSocketMessage("message_updated", {
              messageId: processingMessage.id,
              conversationId,
              content: responseContent,
              systemSources: connectedSystems.map((s) => s.name),
              timestamp: new Date().toISOString(),
            });

            console.log(
              `Ask endpoint: Sent WebSocket notification about message update`,
            );
          }
        } catch (wsError) {
          console.error(
            "Non-critical error with WebSocket notification:",
            wsError,
          );
        }

        // Return everything the client needs
        return res.json({
          response: responseContent,
          conversationId,
          userMessageId: userMessage.id,
          assistantMessageId: processingMessage.id,
          systemSources: connectedSystems.map((s) => s.name),
        });
      } catch (error: any) {
        console.error("Error processing request:", error);

        // Update the processing message with error info for the user
        try {
          await storage.updateMessage(processingMessage.id, {
            content:
              "Sorry, I encountered an error processing your request. Please try again later.",
            systemSources: [],
          });
        } catch (updateError) {
          console.error("Failed to update error message:", updateError);
        }

        // Return error to client
        return res.status(500).json({
          error: "Error processing with OpenAI",
          message: error.message,
          conversationId,
          userMessageId: userMessage.id,
          assistantMessageId: processingMessage.id,
        });
      }
    } catch (error: any) {
      console.error("Server error in /ask endpoint:", error);
      return res.status(500).json({
        error: "Server error processing request",
        message: error.message,
      });
    }
  });

  // Helper function for mock responses
  function generateMockResponse(prompt: string, systems: any[]): string {
    console.log("Generating mock response for prompt:", prompt);

    // Create a standard response prefix
    let response =
      "I've analyzed your request and I'm retrieving information from our connected enterprise systems. ";

    // Simple keyword matching for demo responses
    const normalizedContent = prompt.toLowerCase();

    if (
      normalizedContent.includes("sales") ||
      normalizedContent.includes("revenue")
    ) {
      response +=
        "Based on our sales data, we're seeing a 15% increase in revenue compared to last quarter. The top-performing product categories are enterprise solutions and managed services.";
    } else if (
      normalizedContent.includes("customer") ||
      normalizedContent.includes("retention")
    ) {
      response +=
        "Our customer retention rate is currently at 87%, which is 3% higher than industry average. The most successful retention strategies have been our loyalty program and personalized outreach campaigns.";
    } else if (
      normalizedContent.includes("pipeline") ||
      normalizedContent.includes("forecast")
    ) {
      response +=
        "The current sales pipeline shows $3.2M in qualified opportunities, with an expected close rate of 32% based on historical data. The forecast for Q2 is trending upward with a projected 8% growth.";
    } else if (
      normalizedContent.includes("system") ||
      normalizedContent.includes("connected")
    ) {
      response += `You currently have access to ${systems.length} enterprise systems: ${systems.map((s) => s.name).join(", ")}. Each system contains specialized data that can be queried through this interface.`;
    } else {
      response +=
        "I don't have specific data on this particular query in our systems. Could you provide more details about what business metrics or information you're interested in?";
    }

    return response;
  }

  apiRouter.post("/debug-message", async (req: Request, res: Response) => {
    try {
      // Create a new conversation with a fixed name
      const newConversation = await storage.createConversation({
        title: "Debug Test Conversation",
        userId: 1, // Default to user ID 1 for simplicity
      });

      const conversationId = newConversation.id;

      // Save user message - simple debug text
      const userMessage = await storage.createMessage({
        conversationId,
        content: req.body.content || "Test debug message",
        role: "user",
        systemSources: [],
        visualizations: [],
      });

      // Create a placeholder response message
      const processingMessage = await storage.createMessage({
        conversationId,
        content: "Processing debug message...",
        role: "assistant",
        systemSources: [],
        visualizations: [],
      });

      // Send immediate successful response
      res.status(201).json({
        userMessage,
        processingMessage,
        conversationId,
      });

      // Direct update without any complex routing
      setTimeout(async () => {
        try {
          // Update message in storage
          const updatedMessage = await storage.updateMessage(
            processingMessage.id,
            {
              content:
                "This is a direct debug response that bypasses all complex logic. If you can see this message, the basic storage and WebSocket mechanisms are working.",
              systemSources: ["Debug System"],
            },
          );

          console.log(
            `Debug message updated in database: ID ${processingMessage.id}`,
          );

          // Try to broadcast the update via WebSocket
          try {
            const express = (global as any).expressApp;
            if (express && express.broadcastWebSocketMessage) {
              express.broadcastWebSocketMessage("message_updated", {
                messageId: processingMessage.id,
                conversationId,
                content:
                  "This is a direct debug response that bypasses all complex logic. If you can see this message, the basic storage and WebSocket mechanisms are working.",
                systemSources: ["Debug System"],
                timestamp: new Date().toISOString(),
              });
              console.log(
                `Broadcast debug message update for ID ${processingMessage.id}`,
              );
            }
          } catch (wsError) {
            console.error("Error broadcasting debug message update:", wsError);
          }
        } catch (error) {
          console.error("Error updating debug message:", error);
        }
      }, 2000); // 2 second delay to simulate processing
    } catch (error) {
      console.error("Debug message route error:", error);
      res.status(500).json({ error: "Debug message route failed" });
    }
  });

  // Document routes
  apiRouter.get("/documents", async (req: Request, res: Response) => {
    try {
      // Get userId from query or session (defaulting to null for demo)
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : req.session.userId || null;

      const documents = await storage.getDocuments(userId || undefined);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  apiRouter.get("/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error(`Error fetching document ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  apiRouter.get(
    "/conversations/:conversationId/documents",
    async (req: Request, res: Response) => {
      try {
        const conversationId = parseInt(req.params.conversationId);

        // First check if the conversation exists
        const conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        const documents =
          await storage.getConversationDocuments(conversationId);
        res.json(documents);
      } catch (error) {
        console.error(
          `Error fetching documents for conversation ${req.params.conversationId}:`,
          error,
        );
        res
          .status(500)
          .json({ error: "Failed to fetch conversation documents" });
      }
    },
  );

  apiRouter.post("/documents", async (req: Request, res: Response) => {
    try {
      const result = documentUploadRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid document data", details: result.error });
      }

      // Create document using the validated data
      const document = await storage.createDocument(result.data);

      res.status(201).json(document);

      // TODO: Process the document asynchronously
      // This would involve analyzing the document with LLM
      // For now, just update status to "processed" after a delay
      setTimeout(async () => {
        try {
          await storage.updateDocumentStatus(document.id, "processed");
          console.log(`Document ${document.id} marked as processed`);
        } catch (err) {
          console.error(`Error updating document ${document.id} status:`, err);
        }
      }, 2000);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  apiRouter.put("/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = documentUploadRequestSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Invalid document data", details: result.error });
      }

      const updatedDocument = await storage.updateDocument(id, result.data);

      if (!updatedDocument) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(updatedDocument);
    } catch (error) {
      console.error(`Error updating document ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  apiRouter.delete("/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDocument(id);

      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting document ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Signup endpoint for landing page
  apiRouter.post("/signups", async (req: Request, res: Response) => {
    try {
      // Validate input
      const parsed = insertSignupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }
      const signup = await storage.createSignup(parsed.data);

      // Send email notification
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SOE_SIGNUP_EMAIL_USER,
          pass: process.env.SOE_SIGNUP_EMAIL_PASS,
        },
      });
      const mailOptions = {
        from: process.env.SOE_SIGNUP_EMAIL_USER,
        to: "dangshaw@gmail.com",
        subject: `New SOE Waitlist Signup: ${signup.email}`,
        text: `New signup:\n\nName: ${signup.name}\nJob Title: ${signup.jobTitle || ""}\nEmail: ${signup.email}\nSystems Used: ${signup.systemsUsed || ""}\nPhone: ${signup.phone || ""}`,
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error("Signup email failed:", err);
      }
      return res.status(201).json({ success: true });
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ error: "Failed to process signup" });
    }
  });

  // Mount the Auth router
  app.use("/auth", authRouter);
  app.use("/", salesforceAuth);

  // Add backward compatibility routes for our client-side auth
  app.post("/api/login", async (req, res) => {
    console.log("Login attempt:", req.body.username);

    try {
      const user = await storage.loginUser(
        req.body.username,
        req.body.password,
      );
      if (user) {
        // Set up session
        (req as any).user = user;
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          accessLevel: user.accessLevel,
          subscriptionTier: user.subscriptionTier,
          provider: "local",
        });
      } else {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/register", async (req, res) => {
    console.log("Register attempt:", req.body);

    // For the demo, simulate a successful registration
    return res.status(201).json({
      id: 1,
      username: req.body.username,
      email: req.body.email,
      accessLevel: "read",
      subscriptionTier: "free",
      provider: "local",
    });
  });

  app.post("/api/logout", (req, res) => {
    console.log("Logout attempt");
    return res.sendStatus(200);
  });

  // Remove the hardcoded demo user endpoint - use proper authentication

  // Subscription Management Routes

  // Get available subscription plans
  apiRouter.get("/subscription/plans", async (req: Request, res: Response) => {
    try {
      const plans = {
        free: {
          id: "free",
          name: "Free Tier",
          ...tierLimits.free,
        },
        pro: {
          id: "pro",
          name: "Pro Tier",
          ...tierLimits.pro,
        },
        enterprise: {
          id: "enterprise",
          name: "Enterprise Tier",
          ...tierLimits.enterprise,
        },
      };

      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  // Subscription routes (commented out for testing)
  /*
  apiRouter.post(
    "/subscription/setup-intent",
    async (req: Request, res: Response) => {
      try {
        if (!req.session.userId) {
          return res.status(401).json({ error: "User must be authenticated" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create or retrieve a Stripe customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.username,
            metadata: {
              userId: user.id.toString(),
            },
          });

          stripeCustomerId = customer.id;

          // Update user with Stripe customer ID
          await storage.updateUserStripeInfo(user.id, {
            stripeCustomerId,
            stripeSubscriptionId: "",
          });
        }

        // Create a SetupIntent to collect payment method
        const setupIntent = await stripe.setupIntents.create({
          customer: stripeCustomerId,
          payment_method_types: ["card"],
        });

        res.json({
          clientSecret: setupIntent.client_secret,
          customerId: stripeCustomerId,
        });
      } catch (error) {
        console.error("Error creating setup intent:", error);
        res.status(500).json({ error: "Failed to create setup intent" });
      }
    },
  );

  // Create a subscription
  apiRouter.post(
    "/subscription/create",
    async (req: Request, res: Response) => {
      try {
        const { paymentMethodId, planId } = req.body;

        if (!req.session.userId) {
          return res.status(401).json({ error: "User must be authenticated" });
        }

        if (!paymentMethodId || !planId) {
          return res
            .status(400)
            .json({ error: "Missing payment method ID or plan ID" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.stripeCustomerId) {
          return res
            .status(400)
            .json({ error: "User has no Stripe customer ID" });
        }

        // Define price IDs based on plan
        let priceId = "";
        let subscriptionTier = user.subscriptionTier;

        if (planId === "pro") {
          priceId = process.env.STRIPE_PRO_PRICE_ID || "price_pro";
          subscriptionTier = SubscriptionTier.PRO;
        } else if (planId === "enterprise") {
          priceId =
            process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise";
          subscriptionTier = SubscriptionTier.ENTERPRISE;
        } else {
          return res.status(400).json({ error: "Invalid plan ID" });
        }

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
        });

        // Set the payment method as the default
        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
          customer: user.stripeCustomerId,
          items: [{ price: priceId }],
          expand: ["latest_invoice.payment_intent"],
        });

        // Update user subscription in our database
        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
        });

        // Update user's subscription tier
        await storage.updateUserSubscription(
          user.id,
          subscriptionTier as SubscriptionTierType,
        );

        res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
          tier: subscriptionTier,
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ error: "Failed to create subscription" });
      }
    },
  );

  // Get current user's subscription
  apiRouter.get(
    "/subscription/current",
    async (req: Request, res: Response) => {
      try {
        if (!req.session.userId) {
          return res.status(401).json({ error: "User must be authenticated" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.stripeSubscriptionId) {
          return res.json({
            tier: user.subscriptionTier,
            status: "none",
            limits: tierLimits[user.subscriptionTier],
          });
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
        );

        res.json({
          tier: user.subscriptionTier,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          limits: tierLimits[user.subscriptionTier],
        });
      } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({ error: "Failed to fetch subscription" });
      }
    },
  );

  // Cancel subscription
  apiRouter.post(
    "/subscription/cancel",
    async (req: Request, res: Response) => {
      try {
        if (!req.session.userId) {
          return res.status(401).json({ error: "User must be authenticated" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.stripeSubscriptionId) {
          return res
            .status(400)
            .json({ error: "User has no active subscription" });
        }

        // Cancel the subscription at period end
        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          },
        );

        res.json({
          status: subscription.status,
          cancelAt: new Date(subscription.cancel_at * 1000),
        });
      } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({ error: "Failed to cancel subscription" });
      }
    },
  );
  */

  // Stripe webhook handler (commented out for testing)
  /*
  apiRouter.post(
    "/webhook/stripe",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        return res.status(400).send("Missing Stripe signature");
      }

      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET || "whsec_test",
        );

        // Handle the event
        switch (event.type) {
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
            const subscription = event.data.object as Stripe.Subscription;
            const customer = subscription.customer as string;
            const user = await storage.getUserByStripeCustomerId(customer);

            if (user) {
              if (subscription.status === "active") {
                // Update user subscription tier based on the product
                const item = subscription.items.data[0];
                const productId = (item.price as Stripe.Price)
                  .product as string;

                // You would need to map the Stripe product ID to your subscription tiers
                // This is just a placeholder logic
                let newTier = user.subscriptionTier;

                if (productId.includes("pro")) {
                  newTier = SubscriptionTier.PRO;
                } else if (productId.includes("enterprise")) {
                  newTier = SubscriptionTier.ENTERPRISE;
                }

                await storage.updateUserSubscription(user.id, newTier);
              } else if (subscription.status === "canceled") {
                // Downgrade to free tier
                await storage.updateUserSubscription(
                  user.id,
                  SubscriptionTier.FREE,
                );
              }
            }
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("Webhook error:", error);
        res.status(400).send(`Webhook Error: ${error.message}`);
      }
    },
  );
  */

  // Mount admin routes properly
  apiRouter.use("/admin", adminRouter);

  // Mount the API router with admin routes included
  app.use("/api", apiRouter);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
