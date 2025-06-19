import express, { type Request, type Response } from "express";

export const authRouter = express.Router();

// Get current user
authRouter.get("/user", async (req: Request, res: Response) => {
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

// Logout
authRouter.post("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Check authentication status
authRouter.get("/status", (req: Request, res: Response) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ 
      authenticated: true, 
      user: req.user 
    });
  } else {
    res.json({ authenticated: false });
  }
}); 