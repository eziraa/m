import { NextFunction, Request, Response } from "express";

/**
 * Middleware to require the user to have either the 'AGENT' or 'ADMIN' role.
 */
export function requireAgent(req: Request, res: Response, next: NextFunction) {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { role } = req.identity;

  if (role !== "AGENT" && role !== "ADMIN") {
    console.log("forbidden_agent_scope", role);
    res.status(403).json({ error: "forbidden_agent_scope" });
    return;
  }

  next();
}
