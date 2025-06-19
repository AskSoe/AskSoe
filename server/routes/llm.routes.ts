import express, { type Request, type Response } from "express";
import { llmProviderRequestSchema } from "../../shared/schema";
import { llmService } from "../services";

export const llmRouter = express.Router();

// Get all LLM providers
llmRouter.get("/", async (req: Request, res: Response) => {
  try {
    const providers = await llmService.getAllProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch LLM providers" });
  }
});

// Get active LLM provider
llmRouter.get("/active", async (req: Request, res: Response) => {
  try {
    const provider = await llmService.getActiveProvider();

    if (!provider) {
      return res
        .status(404)
        .json({ error: "No active LLM provider found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active LLM provider" });
  }
});

// Create new LLM provider
llmRouter.post("/", async (req: Request, res: Response) => {
  try {
    const result = llmProviderRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid LLM provider data", details: result.error });
    }

    const provider = await llmService.createProvider({
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

// Update LLM provider
llmRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = llmProviderRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid LLM provider data", details: result.error });
    }

    const updatedProvider = await llmService.updateProvider(id, {
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

// Activate LLM provider
llmRouter.post("/:id/activate", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const provider = await llmService.setActiveProvider(id);

    if (!provider) {
      return res.status(404).json({ error: "LLM provider not found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: "Failed to activate LLM provider" });
  }
}); 