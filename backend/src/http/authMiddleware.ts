import { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../auth/jwt.js";

export type RequestIdentity = {
  userId: string;
  role: "ADMIN" | "AGENT" | "USER";
  telegramId: string;
  agentId: string | null;
};

declare module "express-serve-static-core" {
  interface Request {
    identity?: RequestIdentity;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.header("authorization");
  if (!bearer?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  const token = bearer.slice(7);
  try {
    const payload = verifyAuthToken(token);
    req.identity = {
      userId: payload.sub,
      role: payload.role,
      telegramId: payload.telegramId,
      agentId: payload.agentId,
    };
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}
