import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  boards,
  gameSessions,
  rooms,
  sessionCalledNumbers,
  users,
} from "../db/schema.js";
import type { RequestIdentity } from "../http/authMiddleware.js";
import {
  emitSessionResultReady,
  getSessionResultForIdentity,
} from "./sessionResultNotifier.js";
import { getIo } from "../realtime/ioHub.js";
import { logger } from "../utils/logger.js";
import { incCounter } from "../utils/metrics.js";

const ownerId = `node-${process.pid}`;
const leasePrefix = "session:owner:";
const runners = new Map<string, NodeJS.Timeout>();
const heartbeats = new Map<string, NodeJS.Timeout>();
const leaseTokens = new Map<string, string>();
const localLeaseOwners = new Map<string, string>();
const tickingSessions = new Set<string>();

function canAccessSessionOwner(
  identity: RequestIdentity,
  ownerAgentId: string,
  ownerRole: "ADMIN" | "AGENT" | "USER",
) {
  if (identity.role === "ADMIN") return true;
  if (identity.role === "AGENT") {
    return ownerAgentId === identity.userId || ownerRole === "ADMIN";
  }
  if (identity.role === "USER") {
    return ownerRole === "ADMIN" || identity.agentId === ownerAgentId;
  }
  return false;
}

async function acquireLease(
  sessionId: string,
  token: string,
): Promise<boolean> {
  const key = `${leasePrefix}${sessionId}`;
  const value = `${ownerId}:${token}`;
  const existing = localLeaseOwners.get(key);
  if (existing && existing !== value) {
    return false;
  }

  localLeaseOwners.set(key, value);
  return true;
}

async function renewLease(sessionId: string, token: string): Promise<boolean> {
  const key = `${leasePrefix}${sessionId}`;
  const current = localLeaseOwners.get(key);
  return current === `${ownerId}:${token}`;
}

async function releaseLease(sessionId: string, token: string) {
  const key = `${leasePrefix}${sessionId}`;
  const current = localLeaseOwners.get(key);
  if (current === `${ownerId}:${token}`) {
    localLeaseOwners.delete(key);
  }
}

function stopLocalRunner(sessionId: string) {
  const interval = runners.get(sessionId);
  if (interval) {
    clearInterval(interval);
    runners.delete(sessionId);
  }

  const hb = heartbeats.get(sessionId);
  if (hb) {
    clearInterval(hb);
    heartbeats.delete(sessionId);
  }
}

async function stopLocalRunnerWithRelease(sessionId: string) {
  stopLocalRunner(sessionId);
  const token = leaseTokens.get(sessionId);
  if (token) {
    await releaseLease(sessionId, token);
    leaseTokens.delete(sessionId);
    logger.info("session_lease_released", { sessionId, ownerId });
  }
}

function pickRandomUncalled(called: Set<number>, total: number): number | null {
  const remaining: number[] = [];
  for (let n = 1; n <= total; n += 1) {
    if (!called.has(n)) remaining.push(n);
  }
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)] ?? null;
}

async function finishSession(sessionId: string) {
  await db
    .update(gameSessions)
    .set({ status: "finished", finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(gameSessions.id, sessionId));

  await emitSessionResultReady(sessionId, "numbers_exhausted");
}

async function tick(sessionId: string) {
  if (tickingSessions.has(sessionId)) {
    return;
  }

  tickingSessions.add(sessionId);

  try {
    const [session] = await db
      .select({
        id: gameSessions.id,
        status: gameSessions.status,
        totalNumbers: gameSessions.totalNumbers,
        currentSeq: gameSessions.currentSeq,
      })
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (!session || session.status !== "playing") {
      await stopLocalRunnerWithRelease(sessionId);
      return;
    }

    const calledRows = await db
      .select({ number: sessionCalledNumbers.number })
      .from(sessionCalledNumbers)
      .where(eq(sessionCalledNumbers.sessionId, sessionId));

    const calledSet = new Set(calledRows.map((r) => r.number));
    const next = pickRandomUncalled(calledSet, session.totalNumbers);

    if (!next) {
      await finishSession(sessionId);
      await stopLocalRunnerWithRelease(sessionId);
      return;
    }

    const newSeq = session.currentSeq + 1;
    await db.transaction(async (tx) => {
      await tx.insert(sessionCalledNumbers).values({
        sessionId,
        seq: newSeq,
        number: next,
        calledAt: new Date(),
      });

      await tx
        .update(gameSessions)
        .set({ currentSeq: newSeq, currentNumber: next, updatedAt: new Date() })
        .where(eq(gameSessions.id, sessionId));
    });

    const io = getIo();
    io?.to(`session:${sessionId}`).emit("number_called", {
      sessionId,
      seq: newSeq,
      number: next,
      calledAt: Date.now(),
    });
  } finally {
    tickingSessions.delete(sessionId);
  }
}

async function runCountdown(sessionId: string) {
  let session = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
      countdownSeconds: gameSessions.countdownSeconds,
      countdownResets: gameSessions.countdownResets,
      roomId: gameSessions.roomId,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!session || session.status !== "countdown") {
    return;
  }

  const io = getIo();
  for (let sec = session.countdownSeconds; sec >= 1; sec -= 1) {
    const [latest] = await db
      .select({ status: gameSessions.status })
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (!latest || latest.status !== "countdown") {
      return;
    }

    io?.to(`session:${sessionId}`).emit("session_countdown", {
      sessionId,
      secondsLeft: sec,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Check how many unique users joined (boards exist for this session)
  const userCount = await db
    .select({ count: sql`count(distinct ${boards.userId})` })
    .from(boards)
    .where(eq(boards.sessionId, sessionId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  if (userCount < 2) {
    // Not enough players, increment countdownResets
    const newResets = (session.countdownResets ?? 0) + 1;
    if (newResets > 3) {
      // Close and delete session
      await db
        .update(gameSessions)
        .set({
          status: "cancelled",
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, sessionId));
      await db.delete(gameSessions).where(eq(gameSessions.id, sessionId));
      io?.to(`session:${sessionId}`).emit("session_cancelled", {
        sessionId,
        reason: "not_enough_players",
      });
      return;
    } else {
      // Reset countdown
      await db
        .update(gameSessions)
        .set({ countdownResets: newResets, updatedAt: new Date() })
        .where(eq(gameSessions.id, sessionId));
      io?.to(`session:${sessionId}`).emit("session_countdown_reset", {
        sessionId,
        resets: newResets,
      });
      // Restart countdown
      await runCountdown(sessionId);
      return;
    }
  }

  // Enough players joined, start game
  await db
    .update(gameSessions)
    .set({ status: "playing", startedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(gameSessions.id, sessionId), eq(gameSessions.status, "countdown")),
    );

  io?.to(`session:${sessionId}`).emit("session_started", {
    sessionId,
    startedAt: Date.now(),
  });
}

async function startLocalRunner(sessionId: string, token: string) {
  if (runners.has(sessionId)) {
    return;
  }

  leaseTokens.set(sessionId, token);

  heartbeats.set(
    sessionId,
    setInterval(async () => {
      const ok = await renewLease(sessionId, token);
      if (!ok) {
        stopLocalRunner(sessionId);
        leaseTokens.delete(sessionId);
        logger.warn("session_lease_lost", { sessionId, ownerId });
      }
    }, 3000),
  );

  await runCountdown(sessionId);

  const [playing] = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
      callIntervalMs: gameSessions.callIntervalMs,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!playing || playing.status !== "playing") {
    await stopLocalRunnerWithRelease(sessionId);
    return;
  }

  const timer = setInterval(async () => {
    await tick(sessionId);
  }, playing.callIntervalMs);

  runners.set(sessionId, timer);
}

export async function startSession(
  identity: RequestIdentity,
  sessionId: string,
) {
  incCounter("session_start_requests_total");

  if (!(identity.role === "ADMIN" || identity.role === "AGENT")) {
    throw new Error("forbidden_role");
  }

  const [session] = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
      agentId: gameSessions.agentId,
      roomId: gameSessions.roomId,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) throw new Error("session_not_found");
  if (identity.role === "AGENT" && session.agentId !== identity.userId) {
    throw new Error("forbidden_agent_scope");
  }
  if (session.status !== "waiting") {
    throw new Error("session_not_waiting");
  }

  await db
    .update(gameSessions)
    .set({ status: "countdown", updatedAt: new Date() })
    .where(
      and(eq(gameSessions.id, sessionId), eq(gameSessions.status, "waiting")),
    );

  const token = `${Date.now()}-${Math.random()}`;
  const leaseOk = await acquireLease(sessionId, token);
  if (!leaseOk) {
    return { status: "countdown", owner: "another_node" as const };
  }

  void startLocalRunner(sessionId, token);
  return { status: "countdown", owner: "local" as const };
}

export async function autoStartSessionIfWaiting(sessionId: string) {
  const updated = await db
    .update(gameSessions)
    .set({ status: "countdown", updatedAt: new Date() })
    .where(
      and(eq(gameSessions.id, sessionId), eq(gameSessions.status, "waiting")),
    )
    .returning({ id: gameSessions.id });

  if (updated.length === 0) {
    const [latest] = await db
      .select({ status: gameSessions.status })
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    return {
      status: latest?.status ?? "waiting",
      owner: "another_node" as const,
    };
  }

  const token = `${Date.now()}-${Math.random()}`;
  const leaseOk = await acquireLease(sessionId, token);
  if (!leaseOk) {
    return { status: "countdown", owner: "another_node" as const };
  }

  void startLocalRunner(sessionId, token);
  return { status: "countdown", owner: "local" as const };
}

export async function recoverActiveSessions() {
  const sessions = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(inArray(gameSessions.status, ["countdown", "playing"]));

  for (const session of sessions) {
    const token = `${Date.now()}-${Math.random()}`;
    const leaseOk = await acquireLease(session.id, token);
    if (!leaseOk) {
      logger.info("session_recovery_skipped", {
        sessionId: session.id,
        reason: "lease_held_by_other_node",
      });
      continue;
    }

    incCounter("session_recovery_total");
    logger.info("session_recovery_acquired", {
      sessionId: session.id,
      ownerId,
    });
    void startLocalRunner(session.id, token);
  }
}

export async function stopSession(
  identity: RequestIdentity,
  sessionId: string,
) {
  incCounter("session_stop_requests_total");

  if (!(identity.role === "ADMIN" || identity.role === "AGENT")) {
    throw new Error("forbidden_role");
  }

  const [session] = await db
    .select({ id: gameSessions.id, agentId: gameSessions.agentId })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) throw new Error("session_not_found");
  if (identity.role === "AGENT" && session.agentId !== identity.userId) {
    throw new Error("forbidden_agent_scope");
  }

  await stopLocalRunnerWithRelease(sessionId);
  await db
    .update(gameSessions)
    .set({ status: "cancelled", finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(gameSessions.id, sessionId));

  const io = getIo();
  void io;
  await emitSessionResultReady(sessionId, "stopped_by_operator");

  return { status: "cancelled" as const };
}

export async function getSessionState(
  identity: RequestIdentity,
  sessionId: string,
) {
  const [session] = await db
    .select({
      id: gameSessions.id,
      roomId: gameSessions.roomId,
      status: gameSessions.status,
      currentSeq: gameSessions.currentSeq,
      currentNumber: gameSessions.currentNumber,
      winnerUserId: gameSessions.winnerUserId,
      agentId: gameSessions.agentId,
      stakeCents: rooms.boardPriceCents,
      ownerRole: users.role,
    })
    .from(gameSessions)
    .innerJoin(rooms, eq(rooms.id, gameSessions.roomId))
    .innerJoin(users, eq(users.id, rooms.agentId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("session_not_found");
  }

  if (!canAccessSessionOwner(identity, session.agentId, session.ownerRole)) {
    throw new Error("forbidden_agent_scope");
  }

  const recentCalls = await db
    .select({
      seq: sessionCalledNumbers.seq,
      number: sessionCalledNumbers.number,
    })
    .from(sessionCalledNumbers)
    .where(eq(sessionCalledNumbers.sessionId, sessionId))
    .orderBy(sessionCalledNumbers.seq)
    .limit(200);

  const [stats] = await db
    .select({
      playersCount: sql<number>`coalesce(count(distinct ${boards.userId}), 0)`,
      boardsCount: sql<number>`coalesce(count(${boards.id}), 0)`,
      potCents: sql<number>`coalesce(sum(${boards.purchaseAmountCents}), 0)`,
    })
    .from(gameSessions)
    .leftJoin(boards, eq(boards.sessionId, gameSessions.id))
    .where(eq(gameSessions.id, sessionId))
    .groupBy(gameSessions.id)
    .limit(1);

  const viewerResult =
    session.status === "finished"
      ? await getSessionResultForIdentity(
          identity,
          sessionId,
          session.winnerUserId ? "winner_declared" : "numbers_exhausted",
        )
      : session.status === "cancelled"
        ? await getSessionResultForIdentity(
            identity,
            sessionId,
            "stopped_by_operator",
          )
        : null;

  return {
    ...session,
    recentCalls,
    playersCount: stats?.playersCount ?? 0,
    boardsCount: stats?.boardsCount ?? 0,
    potCents: stats?.potCents ?? 0,
    stakeLabel: (session.stakeCents / 100).toFixed(2),
    potLabel: ((stats?.potCents ?? 0) / 100).toFixed(2),
    viewerResult,
  };
}

export async function getSessionDelta(
  identity: RequestIdentity,
  sessionId: string,
  lastSeq: number,
) {
  const state = await getSessionState(identity, sessionId);
  const missedCalls = await db
    .select({
      seq: sessionCalledNumbers.seq,
      number: sessionCalledNumbers.number,
    })
    .from(sessionCalledNumbers)
    .where(
      and(
        eq(sessionCalledNumbers.sessionId, sessionId),
        gt(sessionCalledNumbers.seq, lastSeq),
      ),
    )
    .orderBy(sessionCalledNumbers.seq)
    .limit(500);

  return {
    sessionId: state.id,
    status: state.status,
    currentSeq: state.currentSeq,
    currentNumber: state.currentNumber,
    winnerUserId: state.winnerUserId,
    missedCalls,
  };
}

export async function getBoardSelectionState(
  identity: RequestIdentity,
  sessionId: string,
) {
  const [session] = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
      winnerUserId: gameSessions.winnerUserId,
      updatedAt: gameSessions.updatedAt,
      countdownSeconds: gameSessions.countdownSeconds,
      roomId: gameSessions.roomId,
      roomName: rooms.name,
      stakeCents: rooms.boardPriceCents,
      agentId: gameSessions.agentId,
      ownerRole: users.role,
    })
    .from(gameSessions)
    .innerJoin(rooms, eq(rooms.id, gameSessions.roomId))
    .innerJoin(users, eq(users.id, rooms.agentId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("session_not_found");
  }

  if (!canAccessSessionOwner(identity, session.agentId, session.ownerRole)) {
    throw new Error("forbidden_agent_scope");
  }

  let startsInSec = 0;
  if (session.status === "waiting") {
    startsInSec = session.countdownSeconds;
  } else if (session.status === "countdown") {
    const elapsedSec = Math.floor(
      (Date.now() - session.updatedAt.getTime()) / 1000,
    );
    startsInSec = Math.max(session.countdownSeconds - elapsedSec, 0);
  }

  const viewerResult =
    session.status === "finished"
      ? await getSessionResultForIdentity(
          identity,
          sessionId,
          session.winnerUserId ? "winner_declared" : "numbers_exhausted",
        )
      : session.status === "cancelled"
        ? await getSessionResultForIdentity(
            identity,
            sessionId,
            "stopped_by_operator",
          )
        : null;

  return {
    sessionId: session.id,
    roomId: session.roomId,
    roomName: session.roomName,
    status: session.status,
    startsInSec,
    stakeCents: session.stakeCents,
    stakeLabel: (session.stakeCents / 100).toFixed(2),
    viewerResult,
  };
}

export async function resolveOrCreateActiveSessionByRoomName(
  identity: RequestIdentity,
  roomName: string,
) {
  const normalizedRoomName = roomName.trim();
  if (!normalizedRoomName) {
    throw new Error("room_name_required");
  }

  const roomFilters: Array<ReturnType<typeof eq>> = [
    eq(rooms.status, "active"),
    eq(rooms.name, normalizedRoomName),
  ];

  if (identity.role === "AGENT") {
    const accessFilter = or(
      eq(rooms.agentId, identity.userId),
      eq(users.role, "ADMIN"),
    ) as ReturnType<typeof eq>;
    roomFilters.push(accessFilter);
  } else if (identity.role === "USER") {
    const accessFilter = identity.agentId
      ? or(eq(rooms.agentId, identity.agentId), eq(users.role, "ADMIN"))
      : eq(users.role, "ADMIN");
    roomFilters.push(accessFilter as ReturnType<typeof eq>);
  }

  const [room] = await db
    .select({
      id: rooms.id,
      agentId: rooms.agentId,
      name: rooms.name,
    })
    .from(rooms)
    .innerJoin(users, eq(users.id, rooms.agentId))
    .where(and(...roomFilters))
    .orderBy(desc(rooms.createdAt))
    .limit(1);

  if (!room) {
    console.log("@@ room not found with ID ", roomFilters);
    throw new Error("room_not_found");
  }

  return resolveOrCreateActiveSessionForRoom(identity, room);
}

export async function resolveOrCreateActiveSessionByRoomId(
  identity: RequestIdentity,
  roomId: string,
) {
  const roomFilters: Array<ReturnType<typeof eq>> = [
    eq(rooms.status, "active"),
    eq(rooms.id, roomId),
  ];

  if (identity.role === "AGENT") {
    const accessFilter = or(
      eq(rooms.agentId, identity.userId),
      eq(users.role, "ADMIN"),
    ) as ReturnType<typeof eq>;
    roomFilters.push(accessFilter);
  } else if (identity.role === "USER") {
    const accessFilter = identity.agentId
      ? or(eq(rooms.agentId, identity.agentId), eq(users.role, "ADMIN"))
      : eq(users.role, "ADMIN");
    roomFilters.push(accessFilter as ReturnType<typeof eq>);
  }

  const [room] = await db
    .select({
      id: rooms.id,
      agentId: rooms.agentId,
      name: rooms.name,
    })
    .from(rooms)
    .innerJoin(users, eq(users.id, rooms.agentId))
    .where(and(...roomFilters))
    .orderBy(desc(rooms.createdAt))
    .limit(1);

  if (!room) {
    throw new Error("room_not_found");
  }

  return resolveOrCreateActiveSessionForRoom(identity, room);
}

async function resolveOrCreateActiveSessionForRoom(
  identity: RequestIdentity,
  room: {
    id: string;
    agentId: string;
    name: string;
  },
) {
  const [activeSession] = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.roomId, room.id),
        inArray(gameSessions.status, ["countdown", "playing"]),
      ),
    )
    .orderBy(desc(gameSessions.createdAt))
    .limit(1);

  if (activeSession) {
    const state = await getBoardSelectionState(identity, activeSession.id);
    return {
      ...state,
      source: "existing" as const,
    };
  }

  let sessionId: string;
  const [waitingSession] = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(
      and(eq(gameSessions.roomId, room.id), eq(gameSessions.status, "waiting")),
    )
    .orderBy(desc(gameSessions.createdAt))
    .limit(1);

  if (waitingSession) {
    sessionId = waitingSession.id;
  } else {
    const [created] = await db
      .insert(gameSessions)
      .values({
        roomId: room.id,
        agentId: room.agentId,
        status: "waiting",
      })
      .returning({ id: gameSessions.id });

    if (!created) {
      throw new Error("session_create_failed");
    }
    sessionId = created.id;
  }

  await autoStartSessionIfWaiting(sessionId);
  const state = await getBoardSelectionState(identity, sessionId);

  return {
    ...state,
    source: "created" as const,
  };
}

export async function shutdownSessionRunners() {
  const sessionIds = Array.from(
    new Set([...runners.keys(), ...heartbeats.keys(), ...leaseTokens.keys()]),
  );

  for (const sessionId of sessionIds) {
    await stopLocalRunnerWithRelease(sessionId);
  }

  localLeaseOwners.clear();
  logger.info("session_runners_shutdown_completed", {
    count: sessionIds.length,
  });
}

export function getSessionRunnerStats() {
  return {
    activeRunners: runners.size,
    activeHeartbeats: heartbeats.size,
    activeLeases: leaseTokens.size,
  };
}

export async function isSessionRedisReady() {
  return true;
}
