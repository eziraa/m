import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { gameSessions, rooms, sessionCalledNumbers } from "../db/schema.js";
import type { RequestIdentity } from "../http/authMiddleware.js";
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

  const io = getIo();
  io?.to(`session:${sessionId}`).emit("game_finished", {
    sessionId,
    reason: "numbers_exhausted",
    finishedAt: Date.now(),
  });
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
  const [session] = await db
    .select({
      id: gameSessions.id,
      status: gameSessions.status,
      countdownSeconds: gameSessions.countdownSeconds,
      roomId: gameSessions.roomId,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

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
  io?.to(`session:${sessionId}`).emit("game_finished", {
    sessionId,
    reason: "stopped_by_operator",
    finishedAt: Date.now(),
  });

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
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("session_not_found");
  }

  if (identity.role === "AGENT" && session.agentId !== identity.userId) {
    throw new Error("forbidden_agent_scope");
  }
  if (
    identity.role === "USER" &&
    (!identity.agentId || identity.agentId !== session.agentId)
  ) {
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

  return {
    ...session,
    recentCalls,
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
      updatedAt: gameSessions.updatedAt,
      countdownSeconds: gameSessions.countdownSeconds,
      roomId: gameSessions.roomId,
      roomName: rooms.name,
      stakeCents: rooms.boardPriceCents,
      agentId: gameSessions.agentId,
    })
    .from(gameSessions)
    .innerJoin(rooms, eq(rooms.id, gameSessions.roomId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("session_not_found");
  }

  if (identity.role === "AGENT" && session.agentId !== identity.userId) {
    throw new Error("forbidden_agent_scope");
  }
  if (
    identity.role === "USER" &&
    (!identity.agentId || identity.agentId !== session.agentId)
  ) {
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

  return {
    sessionId: session.id,
    roomId: session.roomId,
    roomName: session.roomName,
    status: session.status,
    startsInSec,
    stakeCents: session.stakeCents,
    stakeLabel: (session.stakeCents / 100).toFixed(2),
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
