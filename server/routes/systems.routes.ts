import express, { type Request, type Response } from "express";
import { systemConnectionRequestSchema } from "../../shared/schema";
import { systemService } from "../services";

export const systemsRouter = express.Router();

// Get all systems
systemsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const systems = await systemService.getAllSystems();
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch systems" });
  }
});

// Get system by ID
systemsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const system = await systemService.getSystem(id);

    if (!system) {
      return res.status(404).json({ error: "System not found" });
    }

    res.json(system);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch system" });
  }
});

// Create new system
systemsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const result = systemConnectionRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid system data", details: result.error });
    }

    const system = await systemService.createSystem({
      name: result.data.name,
      type: result.data.type,
      connectionDetails: result.data.connectionDetails,
      status: "connected",
    }, req.user?.id);

    res.status(201).json(system);
  } catch (error) {
    res.status(500).json({ error: "Failed to create system" });
  }
});

// Update system
systemsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = systemConnectionRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid system data", details: result.error });
    }

    const updatedSystem = await systemService.updateSystem(id, {
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

// Delete system
systemsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await systemService.deleteSystem(id);

    if (!success) {
      return res.status(404).json({ error: "System not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete system" });
  }
}); 