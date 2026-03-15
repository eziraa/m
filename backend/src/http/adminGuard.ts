import { NextFunction, Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.identity.role !== "ADMIN") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  next();
}
