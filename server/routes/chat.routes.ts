import express, { type Request, type Response } from "express";
import { messageRequestSchema } from "../../shared/schema";
import { chatService } from "../services";

export const chatRouter = express.Router();

// Get all conversations
chatRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const conversations = await chatService.getAllConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get conversation by ID
chatRouter.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const conversation = await chatService.getConversation(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Create new conversation
chatRouter.post("/conversations", async (req: Request, res: Response) => {
  try {
    const conversation = await chatService.createConversation({
      title: req.body.title || "New Conversation",
      userId: req.user?.id,
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get messages for a conversation
chatRouter.get("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = await chatService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message (ask endpoint)
chatRouter.post("/ask", async (req: Request, res: Response) => {
  try {
    const result = messageRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid message data", details: result.error });
    }

    const { content, conversationId } = result.data;

    const result2 = await chatService.processUserMessage(content, conversationId || undefined, req.user?.id);

    res.json(result2);
  } catch (error) {
    console.error("Error in /ask endpoint:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Update conversation
chatRouter.put("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updatedConversation = await chatService.updateConversation(id, {
      title: req.body.title,
    });

    if (!updatedConversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(updatedConversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// Delete conversation
chatRouter.delete("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await chatService.deleteConversation(id);

    if (!success) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
}); 