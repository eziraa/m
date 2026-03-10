import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";

export type TelegramMiniAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type VerifiedInitData = {
  user: TelegramMiniAppUser;
  authDate: number;
  queryId?: string;
  raw: Record<string, string>;
};

function buildDataCheckString(entries: [string, string][]): string {
  return entries
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function computeTelegramHash(dataCheckString: string): Buffer {
  const secretKey = createHmac("sha256", "WebAppData")
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  return createHmac("sha256", secretKey).update(dataCheckString).digest();
}

export function verifyTelegramInitData(initDataRaw: string): VerifiedInitData {
  const params = new URLSearchParams(initDataRaw);
  const hashHex = params.get("hash");

  if (!hashHex) {
    throw new Error("missing_hash");
  }

  const entries: [string, string][] = [];
  const raw: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    entries.push([key, value]);
    raw[key] = value;
  }

  const dataCheckString = buildDataCheckString(entries);
  const expectedHash = computeTelegramHash(dataCheckString);
  const providedHash = Buffer.from(hashHex, "hex");

  if (
    providedHash.length !== expectedHash.length ||
    !timingSafeEqual(providedHash, expectedHash)
  ) {
    throw new Error("invalid_hash");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) {
    throw new Error("missing_auth_date");
  }

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new Error("invalid_auth_date");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > env.TELEGRAM_INITDATA_MAX_AGE_SEC) {
    throw new Error("stale_init_data");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("missing_user");
  }

  let parsedUser: TelegramMiniAppUser;
  try {
    parsedUser = JSON.parse(userRaw) as TelegramMiniAppUser;
  } catch {
    throw new Error("invalid_user_json");
  }

  if (!parsedUser?.id) {
    throw new Error("invalid_user_id");
  }

  return {
    user: parsedUser,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    raw,
  };
}
