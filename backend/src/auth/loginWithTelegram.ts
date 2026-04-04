import { and, eq } from "drizzle-orm";

import { getWelcomeBonusCents } from "../config/runtimeConfig.js";
import { db } from "../db/client.js";
import { users, walletLedger } from "../db/schema.js";
import { signAuthToken } from "./jwt.js";
import { VerifiedInitData } from "./telegramInitData.js";

type LoginResult = {
  token: string;
  role: "ADMIN" | "AGENT" | "USER";
  agentId: string | null;
  profile: {
    userId: string;
    telegramId: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
};

async function resolveAgentIdFromStartParam(
  startParam?: string,
): Promise<string | null> {
  if (!startParam) return null;

  const [agent] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.referralCode, startParam), eq(users.role, "AGENT")))
    .limit(1);

  return agent?.id ?? null;
}

export async function loginWithTelegram(
  verified: VerifiedInitData,
  options?: { startParam?: string },
): Promise<LoginResult> {
  const welcomeBonusCents = await getWelcomeBonusCents();
  const telegramId = String(verified.user.id);
  const referralCode = verified.raw.start_param || options?.startParam;
  const referredByAgentId = await resolveAgentIdFromStartParam(referralCode);

  const [existing] = await db
    .select({
      id: users.id,
      role: users.role,
      referredByAgentId: users.referredByAgentId,
    })
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  let userId = existing?.id;
  let role: "ADMIN" | "AGENT" | "USER" = existing?.role ?? "USER";
  let agentId = existing?.referredByAgentId ?? referredByAgentId ?? null;

  if (!existing) {
    const [created] = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          telegramId,
          role: "USER",
          firstName: verified.user.first_name,
          lastName: verified.user.last_name,
          username: verified.user.username,
          referredByAgentId: agentId,
        })
        .returning({
          id: users.id,
          role: users.role,
          referredByAgentId: users.referredByAgentId,
        });

      if (welcomeBonusCents > 0) {
        await tx.insert(walletLedger).values({
          userId: newUser.id,
          agentId: newUser.referredByAgentId,
          entryType: "referral_reward",
          amountCents: welcomeBonusCents,
          currency: "ETB",
          status: "posted",
          idempotencyKey: `welcome_bonus:${newUser.id}`,
          metadata: {
            reason: "welcome_bonus",
            source: "telegram_signup",
          },
        });
      }

      return [newUser] as const;
    });

    userId = created.id;
    role = created.role;
    agentId = created.referredByAgentId;
  } else {
    await db
      .update(users)
      .set({
        firstName: verified.user.first_name,
        lastName: verified.user.last_name,
        username: verified.user.username,
        updatedAt: new Date(),
        ...(existing.referredByAgentId
          ? {}
          : { referredByAgentId: referredByAgentId ?? null }),
      })
      .where(eq(users.id, existing.id));
  }

  if (!userId) {
    throw new Error("user_persist_failed");
  }

  const token = signAuthToken({
    sub: userId,
    role,
    telegramId,
    agentId,
  });

  return {
    token,
    role,
    agentId,
    profile: {
      userId,
      telegramId,
      firstName: verified.user.first_name ?? null,
      lastName: verified.user.last_name ?? null,
      username: verified.user.username ?? null,
    },
  };
}
