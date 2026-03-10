import { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { checkRateLimit } from "../utils/rateLimit.js";

function resolveHttpRateLimitKey(req: Request): string {
  const auth = req.header("authorization") || "anon";
  const ip = req.ip || "unknown";
  return `rl:http:${ip}:${auth.slice(0, 32)}`;
}

export async function httpRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = resolveHttpRateLimitKey(req);
  const result = await checkRateLimit({
    key,
    max: env.HTTP_RATE_LIMIT_MAX,
    windowSec: env.HTTP_RATE_LIMIT_WINDOW_SEC,
  });

  res.setHeader("x-ratelimit-remaining", String(result.remaining));
  res.setHeader("x-ratelimit-reset", String(result.retryAfterSec));

  if (!result.allowed) {
    res.setHeader("retry-after", String(result.retryAfterSec));
    res.status(429).json({ error: "rate_limit_exceeded" });
    return;
  }

  next();
}
