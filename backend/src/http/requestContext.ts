import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

import { logger } from "../utils/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

export function attachRequestId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const inboundId = req.header("x-request-id");
  const requestId =
    inboundId && inboundId.length > 0 ? inboundId : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  logger.info("http_request", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const message = err instanceof Error ? err.message : "internal_error";

  logger.error("http_error", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    message,
  });

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "internal_error",
    requestId: req.requestId,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: "not_found",
    requestId: req.requestId,
  });
}
