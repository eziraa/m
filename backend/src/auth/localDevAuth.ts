import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { localAuthCredentials, users, walletLedger } from "../db/schema.js";
import { signAuthToken } from "./jwt.js";

type LocalAuthResult = {
  token: string;
  role: "ADMIN" | "AGENT" | "USER";
  agentId: string | null;
  profile: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  const [salt, hashHex] = parts;
  const incoming = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (incoming.length !== expected.length) return false;
  return timingSafeEqual(incoming, expected);
}

export async function signupLocalDev(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  referralCode?: string;
}): Promise<LocalAuthResult> {
  const email = normalizeEmail(input.email);

  const [existingCred] = await db
    .select({ id: localAuthCredentials.id })
    .from(localAuthCredentials)
    .where(eq(localAuthCredentials.email, email))
    .limit(1);

  if (existingCred) {
    throw new Error("dev_email_already_registered");
  }

  let referredByAgentId: string | null = null;
  if (input.referralCode) {
    const [agent] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.referralCode, input.referralCode),
          eq(users.role, "AGENT"),
        ),
      )
      .limit(1);

    referredByAgentId = agent?.id ?? null;
  }

  const [createdUser] = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        role: "USER",
        telegramId: null,
        email,
        username: input.username?.trim() || null,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        referredByAgentId,
      })
      .returning({
        id: users.id,
        role: users.role,
        referredByAgentId: users.referredByAgentId,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      });

    await tx.insert(localAuthCredentials).values({
      userId: newUser.id,
      email,
      passwordHash: hashPassword(input.password),
    });

    if (env.WELCOME_BONUS_CENTS > 0) {
      await tx.insert(walletLedger).values({
        userId: newUser.id,
        agentId: newUser.referredByAgentId,
        entryType: "referral_reward",
        amountCents: env.WELCOME_BONUS_CENTS,
        currency: "ETB",
        status: "posted",
        idempotencyKey: `welcome_bonus:${newUser.id}`,
        metadata: {
          reason: "welcome_bonus",
          source: "local_signup",
        },
      });
    }

    return [newUser] as const;
  });

  const token = signAuthToken({
    sub: createdUser.id,
    role: createdUser.role,
    telegramId: `dev:${email}`,
    agentId: createdUser.referredByAgentId,
  });

  return {
    token,
    role: createdUser.role,
    agentId: createdUser.referredByAgentId,
    profile: {
      userId: createdUser.id,
      email,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      username: createdUser.username,
    },
  };
}

export async function loginLocalDev(input: {
  email: string;
  password: string;
}): Promise<LocalAuthResult> {
  const email = normalizeEmail(input.email);

  const [row] = await db
    .select({
      userId: users.id,
      role: users.role,
      isActive: users.isActive,
      referredByAgentId: users.referredByAgentId,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      passwordHash: localAuthCredentials.passwordHash,
    })
    .from(localAuthCredentials)
    .innerJoin(users, eq(users.id, localAuthCredentials.userId))
    .where(eq(localAuthCredentials.email, email))
    .limit(1);

  if (!row) {
    throw new Error("dev_account_not_found");
  }
  if (!row.isActive) {
    throw new Error("dev_account_inactive");
  }

  const ok = verifyPassword(input.password, row.passwordHash);
  if (!ok) {
    throw new Error("dev_invalid_credentials");
  }

  const token = signAuthToken({
    sub: row.userId,
    role: row.role,
    telegramId: `dev:${email}`,
    agentId: row.referredByAgentId,
  });

  return {
    token,
    role: row.role,
    agentId: row.referredByAgentId,
    profile: {
      userId: row.userId,
      email,
      firstName: row.firstName,
      lastName: row.lastName,
      username: row.username,
    },
  };
}
