import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  SMS_FORWARDER_SECRET: z.string().min(16).optional(),
  TELEGRAM_INITDATA_MAX_AGE_SEC: z.coerce
    .number()
    .int()
    .positive()
    .default(3600),
  FRONTEND_MINIAPP_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000"),
  WELCOME_BONUS_CENTS: z.coerce.number().int().min(0).default(5000),
  AGENT_COMMISSION_BPS: z.coerce.number().int().min(0).max(10000).default(1000),
  HTTP_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  HTTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(240),
  SOCKET_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(10),
  SOCKET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(40),
  LOCAL_DEV_AUTH_ENABLED: z.coerce.boolean().default(false),
});

const parsed = envSchema.parse(process.env);

if (!parsed.LOCAL_DEV_AUTH_ENABLED) {
  if (!parsed.TELEGRAM_BOT_TOKEN || parsed.TELEGRAM_BOT_TOKEN.length < 1) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required when local dev auth is disabled",
    );
  }
  if (
    !parsed.TELEGRAM_WEBHOOK_SECRET ||
    parsed.TELEGRAM_WEBHOOK_SECRET.length < 1
  ) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET is required when local dev auth is disabled",
    );
  }
}

export const env = {
  ...parsed,
  TELEGRAM_BOT_TOKEN: parsed.TELEGRAM_BOT_TOKEN ?? "",
  TELEGRAM_WEBHOOK_SECRET: parsed.TELEGRAM_WEBHOOK_SECRET ?? "",
  SMS_FORWARDER_SECRET: parsed.SMS_FORWARDER_SECRET ?? "",
};
