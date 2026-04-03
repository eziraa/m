import { and, eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  bingoClaims,
  boards,
  gameSessions,
  sessionCalledNumbers,
  sessionWinners,
  users,
} from "../db/schema.js";
import type { RequestIdentity } from "../http/authMiddleware.js";
import { getIo } from "../realtime/ioHub.js";

export type SessionOutcome = "won" | "lost" | "draw";

export type SessionResultReason =
  | "winner_declared"
  | "numbers_exhausted"
  | "stopped_by_operator";

export type SessionResultRedirect = {
  outcome: SessionOutcome;
  targetPath: string;
  winnerUserId: string | null;
  winnerName: string;
  reason: SessionResultReason;
};

export type SessionWinnerBoardResult = {
  sessionId: string;
  roomId: string;
  winnerUserId: string;
  winnerName: string;
  pattern: "row" | "column" | "diagonal" | "full_house" | "corners";
  boardNo: number;
  boardMatrix: number[][];
  markedCells: number[];
  calledNumbers: number[];
  potCents: number;
};

function buildTargetPath(
  roomId: string,
  sessionId: string,
  outcome: SessionOutcome,
): string {
  return `/rooms/${roomId}/session/${sessionId}/${outcome}`;
}

function winnerDisplayName(input: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  if (input.username) return input.username;
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");
  return fullName || "Player";
}

function resolveOutcome(
  viewerUserId: string,
  winnerUserId: string | null,
): SessionOutcome {
  if (!winnerUserId) return "draw";
  return winnerUserId === viewerUserId ? "won" : "lost";
}

async function getSessionResultBase(sessionId: string) {
  const [session] = await db
    .select({
      sessionId: gameSessions.id,
      roomId: gameSessions.roomId,
      winnerUserId: gameSessions.winnerUserId,
      winnerUsername: users.username,
      winnerFirstName: users.firstName,
      winnerLastName: users.lastName,
      potCents: sql<number>`coalesce(sum(${boards.purchaseAmountCents}), 0)`,
    })
    .from(gameSessions)
    .leftJoin(users, eq(users.id, gameSessions.winnerUserId))
    .leftJoin(boards, eq(boards.sessionId, gameSessions.id))
    .where(eq(gameSessions.id, sessionId))
    .groupBy(
      gameSessions.id,
      gameSessions.roomId,
      gameSessions.winnerUserId,
      users.username,
      users.firstName,
      users.lastName,
    )
    .limit(1);

  if (!session) {
    throw new Error("session_not_found");
  }

  return {
    sessionId: session.sessionId,
    roomId: session.roomId,
    winnerUserId: session.winnerUserId,
    winnerName: session.winnerUserId
      ? winnerDisplayName({
          username: session.winnerUsername,
          firstName: session.winnerFirstName,
          lastName: session.winnerLastName,
        })
      : "Player",
    potCents: session.potCents ?? 0,
  };
}

export async function getSessionResultForIdentity(
  identity: RequestIdentity,
  sessionId: string,
  reason: SessionResultReason = "winner_declared",
): Promise<SessionResultRedirect | null> {
  if (identity.role !== "USER") {
    return null;
  }

  const base = await getSessionResultBase(sessionId);
  const [viewerBoard] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(
      and(eq(boards.sessionId, sessionId), eq(boards.userId, identity.userId)),
    )
    .limit(1);

  if (!viewerBoard) {
    return null;
  }

  const outcome = resolveOutcome(identity.userId, base.winnerUserId);
  return {
    outcome,
    targetPath: buildTargetPath(base.roomId, sessionId, outcome),
    winnerUserId: base.winnerUserId,
    winnerName: base.winnerName,
    reason,
  };
}

export async function emitSessionResultReady(
  sessionId: string,
  reason: SessionResultReason,
) {
  const io = getIo();
  const base = await getSessionResultBase(sessionId);

  const participants = await db
    .select({ userId: boards.userId })
    .from(boards)
    .where(eq(boards.sessionId, sessionId))
    .groupBy(boards.userId);

  for (const participant of participants) {
    const outcome = resolveOutcome(participant.userId, base.winnerUserId);

    io?.to(`user:${participant.userId}`).emit("session_result_ready", {
      sessionId,
      roomId: base.roomId,
      outcome,
      targetPath: buildTargetPath(base.roomId, sessionId, outcome),
      winnerUserId: base.winnerUserId,
      winnerName: base.winnerName,
      potCents: base.potCents,
      reason,
      finishedAt: Date.now(),
    });
  }

  io?.to(`session:${sessionId}`).emit("game_finished", {
    sessionId,
    roomId: base.roomId,
    winnerUserId: base.winnerUserId,
    winnerName: base.winnerName,
    potCents: base.potCents,
    reason,
    finishedAt: Date.now(),
  });
}

export async function getWinnerBoardResultForIdentity(
  identity: RequestIdentity,
  sessionId: string,
): Promise<SessionWinnerBoardResult | null> {
  if (identity.role !== "USER") {
    return null;
  }

  const [viewerBoard] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(
      and(eq(boards.sessionId, sessionId), eq(boards.userId, identity.userId)),
    )
    .limit(1);

  if (!viewerBoard) {
    return null;
  }

  const base = await getSessionResultBase(sessionId);

  const [winner] = await db
    .select({
      sessionId: gameSessions.id,
      roomId: gameSessions.roomId,
      winnerUserId: gameSessions.winnerUserId,
      winnerUsername: users.username,
      winnerFirstName: users.firstName,
      winnerLastName: users.lastName,
      pattern: bingoClaims.pattern,
      boardNo: boards.boardNo,
      boardMatrix: boards.boardMatrix,
      markedCells: bingoClaims.markedCells,
    })
    .from(gameSessions)
    .innerJoin(sessionWinners, eq(sessionWinners.sessionId, gameSessions.id))
    .innerJoin(boards, eq(boards.id, sessionWinners.boardId))
    .innerJoin(bingoClaims, eq(bingoClaims.id, sessionWinners.claimId))
    .leftJoin(users, eq(users.id, gameSessions.winnerUserId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (
    !winner ||
    !winner.winnerUserId ||
    !Array.isArray(winner.boardMatrix) ||
    !Array.isArray(winner.markedCells)
  ) {
    return null;
  }

  const [called] = await db
    .select({
      numbers: sql<number[]>`coalesce(array_agg(${sessionCalledNumbers.number} order by ${sessionCalledNumbers.seq}), '{}')`,
    })
    .from(sessionCalledNumbers)
    .where(eq(sessionCalledNumbers.sessionId, sessionId));

  return {
    sessionId: winner.sessionId,
    roomId: winner.roomId,
    winnerUserId: winner.winnerUserId,
    winnerName: winnerDisplayName({
      username: winner.winnerUsername,
      firstName: winner.winnerFirstName,
      lastName: winner.winnerLastName,
    }),
    pattern: winner.pattern,
    boardNo: winner.boardNo,
    boardMatrix: winner.boardMatrix as number[][],
    markedCells: winner.markedCells as number[],
    calledNumbers: called?.numbers ?? [],
    potCents: base.potCents,
  };
}
