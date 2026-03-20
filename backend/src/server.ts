import express from "express";
import { createServer } from "node:http";

import { env } from "./config/env.js";
import { closeDbPool, getDbPoolStats, isDbReady } from "./db/client.js";
import { recoverActiveSessions } from "./game/sessionRunner.js";
import {
  getSessionRunnerStats,
  shutdownSessionRunners,
} from "./game/sessionRunner.js";
import {
  attachRequestId,
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "./http/requestContext.js";
import authRouter from "./http/authRouter.js";
import adminRouter from "./http/adminRouter.js";
import agentRouter from "./http/agentRouter.js";
import gameRouter from "./http/gameRouter.js";
import { httpRateLimit } from "./http/rateLimitMiddleware.js";
import telegramWebhookRouter from "./http/telegramWebhook.js";
import userRouter from "./http/userRouter.js";
import walletRouter from "./http/walletRouter.js";
import roomsRouter from "./http/roomsRouter.js";
import { closeSocketServer, createSocketServer } from "./realtime/socket.js";
import { isAllowedOrigin } from "./utils/cors.js";
import { logger } from "./utils/logger.js";
import { getMetricsCounters } from "./utils/metrics.js";
import { closeRateLimitClient } from "./utils/rateLimit.js";

const app = express();
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = req.header("origin");
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
  }

  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) {
      res.status(403).json({ error: "cors_origin_not_allowed" });
      return;
    }

    res.status(204).send();
    return;
  }

  next();
});

app.use(attachRequestId);
app.use(requestLogger);
app.use(express.json({ limit: "256kb" }));
app.use(httpRateLimit);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/health/ready", async (_req, res) => {
  const dbReady = await isDbReady();
  const ok = dbReady;

  res.status(ok ? 200 : 503).json({
    ok,
    service: "m-bingo-backend",
    checks: {
      dbReady,
    },
  });
});

app.get("/metrics", (_req, res) => {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptimeSec: Math.floor(process.uptime()),
      memoryRssBytes: process.memoryUsage().rss,
      memoryHeapUsedBytes: process.memoryUsage().heapUsed,
    },
    dbPool: getDbPoolStats(),
    sessionRunners: getSessionRunnerStats(),
    counters: getMetricsCounters(),
  });
});

app.use(authRouter);
app.use(adminRouter);
app.use(agentRouter);
app.use(gameRouter);
app.use(userRouter);
app.use(walletRouter);
app.use(roomsRouter);
app.use(telegramWebhookRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const server = createServer(app);
const io = createSocketServer(server);

void recoverActiveSessions();

server.listen(env.PORT, () => {
  logger.info("backend_started", { port: env.PORT, env: env.NODE_ENV });
});

let shuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.warn("graceful_shutdown_started", { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error("graceful_shutdown_timeout", { signal, timeoutMs: 15000 });
    process.exit(1);
  }, 15000);

  forceExitTimer.unref();

  await shutdownSessionRunners();
  await closeSocketServer(io);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await closeDbPool();
  await closeRateLimitClient();

  clearTimeout(forceExitTimer);
  logger.info("graceful_shutdown_completed", { signal });
  process.exit(0);
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", {
    message: error.message,
    stack: error.stack,
  });
  void gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  void gracefulShutdown("unhandledRejection");
});
