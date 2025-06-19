import express, { type Request, type Response } from "express";
import { subscriptionService, authService } from "../services";

export const subscriptionRouter = express.Router();

// Get current subscription
subscriptionRouter.get("/current", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const subscription = await subscriptionService.getCurrentSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// Get available plans
subscriptionRouter.get("/plans", async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// Upgrade subscription (admin only)
subscriptionRouter.post("/upgrade", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { userId, newTier } = req.body;

    if (!userId || !newTier) {
      return res.status(400).json({ error: "userId and newTier are required" });
    }

    // Check if user is admin
    const isAdmin = await authService.isUserAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const updatedUser = await subscriptionService.upgradeSubscription(userId, newTier);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Subscription updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to upgrade subscription" });
  }
}); 