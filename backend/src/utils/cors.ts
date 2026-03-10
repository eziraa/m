import { env } from "../config/env.js";

const configuredOrigins = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((x) => x.trim())
  .filter((x) => x.length > 0);

const allowAnyOrigin = configuredOrigins.includes("*");

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Non-browser clients may not send Origin.
  if (!origin) return true;
  if (allowAnyOrigin) return true;
  return configuredOrigins.includes(origin);
}

export function corsAllowedOrigins() {
  return configuredOrigins;
}
