import type { Redis } from "ioredis";

import { logger } from "./logger.js";

function redisErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const first = error.errors[0];
    if (first instanceof Error && first.message) {
      return first.message;
    }
    return "aggregate_error";
  }

  if (error instanceof Error) {
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && maybeCode.length > 0) {
      return maybeCode;
    }

    return error.name || "error";
  }

  return "unknown";
}

export function attachRedisEventLogging(client: Redis, clientName: string) {
  let lastErrorLogAt = 0;

  client.on("error", (error: unknown) => {
    const now = Date.now();
    // Throttle repeated ECONNREFUSED/retry spam when Redis is down.
    if (now - lastErrorLogAt < 10000) {
      return;
    }
    lastErrorLogAt = now;

    logger.warn("redis_client_error", {
      client: clientName,
      message: redisErrorMessage(error),
    });
  });

  client.on("connect", () => {
    logger.info("redis_client_connect", { client: clientName });
  });

  client.on("ready", () => {
    logger.info("redis_client_ready", { client: clientName });
  });

  client.on("end", () => {
    logger.warn("redis_client_end", { client: clientName });
  });
}
