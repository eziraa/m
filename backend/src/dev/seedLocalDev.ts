import { and, eq, inArray } from "drizzle-orm";

import { env } from "../config/env.js";
import { getSessionConfigNumbers } from "../config/runtimeConfig.js";
import { closeDbPool, db } from "../db/client.js";
import { gameSessions, rooms, users } from "../db/schema.js";

const DEV_AGENT_EMAIL = "dev-agent@mbingo.local";
const DEV_AGENT_REFERRAL = "DEVAGENT";
const DEV_ROOM_NAME = "Dev Starter Room";

async function ensureAgent() {
  const [existing] = await db
    .select({
      id: users.id,
      referralCode: users.referralCode,
    })
    .from(users)
    .where(eq(users.email, DEV_AGENT_EMAIL))
    .limit(1);

  if (existing) {
    if (existing.referralCode !== DEV_AGENT_REFERRAL) {
      await db
        .update(users)
        .set({ referralCode: DEV_AGENT_REFERRAL, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }
    return {
      id: existing.id,
      referralCode: DEV_AGENT_REFERRAL,
      created: false,
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      role: "AGENT",
      telegramId: null,
      email: DEV_AGENT_EMAIL,
      username: "dev_agent",
      firstName: "Dev",
      lastName: "Agent",
      referralCode: DEV_AGENT_REFERRAL,
      isActive: true,
    })
    .returning({
      id: users.id,
      referralCode: users.referralCode,
    });

  return {
    id: created.id,
    referralCode: created.referralCode ?? DEV_AGENT_REFERRAL,
    created: true,
  };
}

async function ensureRoom(agentId: string) {
  const [existing] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.agentId, agentId), eq(rooms.name, DEV_ROOM_NAME)))
    .limit(1);

  if (existing) {
    await db
      .update(rooms)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(rooms.id, existing.id));

    return { id: existing.id, created: false };
  }

  const [created] = await db
    .insert(rooms)
    .values({
      agentId,
      name: DEV_ROOM_NAME,
      description: "Seeded room for local end-to-end tests",
      boardPriceCents: 1000,
      status: "active",
      color: "from-blue-500 to-blue-700",
      maxPlayers: 500,
    })
    .returning({ id: rooms.id });

  return { id: created.id, created: true };
}

async function ensureSession(roomId: string, agentId: string) {
  const sessionConfig = await getSessionConfigNumbers();
  const [live] = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.roomId, roomId),
        inArray(gameSessions.status, ["waiting", "countdown", "playing"]),
      ),
    )
    .limit(1);

  if (live) {
    return {
      id: live.id,
      status: live.status,
      created: false,
    };
  }

  const [created] = await db
    .insert(gameSessions)
    .values({
      roomId,
      agentId,
      status: "waiting",
      countdownSeconds: sessionConfig.countdownSeconds,
      countdownResets: 0,
      callIntervalMs: sessionConfig.callIntervalMs,
      totalNumbers: sessionConfig.totalNumbers,
      currentSeq: 0,
      currentNumber: null,
      version: 0,
    })
    .returning({ id: gameSessions.id, status: gameSessions.status });

  return {
    id: created.id,
    status: created.status,
    created: true,
  };
}

async function main() {
  if (!env.LOCAL_DEV_AUTH_ENABLED) {
    throw new Error(
      "LOCAL_DEV_AUTH_ENABLED must be true before running dev seed",
    );
  }

  const agent = await ensureAgent();
  const room = await ensureRoom(agent.id);
  const session = await ensureSession(room.id, agent.id);

  console.log("Local dev seed complete");
  console.log(`agentEmail=${DEV_AGENT_EMAIL}`);
  console.log(`referralCode=${agent.referralCode}`);
  console.log(`roomId=${room.id}`);
  console.log(`sessionId=${session.id}`);
  console.log(`sessionStatus=${session.status}`);
  console.log(
    "Use referralCode during local signup to bind the user to this agent.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "local_dev_seed_failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbPool();
  });
