import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import {
  boardPurchaseRequests,
  bingoClaims,
  boards,
  gameSessions,
  rooms,
  sessionCalledNumbers,
  sessionWinners,
  users,
  walletLedger,
  type Board,
} from "../db/schema.js";
import { type RequestIdentity } from "../http/authMiddleware.js";
import { getIo } from "../realtime/ioHub.js";
import { incCounter } from "../utils/metrics.js";
import {
  boardHash,
  generateBingoBoard,
  type BoardMatrix,
} from "./boardGenerator.js";
import { autoStartSessionIfWaiting } from "./sessionRunner.js";
import {
  requiredNumbersForPattern,
  type WinningPatternInput,
} from "./patterns.js";

export async function canJoinRoom(
  identity: RequestIdentity,
  roomId: string,
): Promise<boolean> {
  const [room] = await db
    .select({ id: rooms.id, agentId: rooms.agentId, status: rooms.status })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);

  if (!room || room.status !== "active") return false;
  if (identity.role === "ADMIN") return true;
  if (identity.role === "AGENT") return room.agentId === identity.userId;
  if (identity.role === "USER")
    return Boolean(identity.agentId && room.agentId === identity.agentId);
  return false;
}

export async function canJoinSession(
  identity: RequestIdentity,
  sessionId: string,
): Promise<{ ok: boolean; roomId?: string }> {
  const [session] = await db
    .select({
      sessionId: gameSessions.id,
      roomId: gameSessions.roomId,
      sessionAgentId: gameSessions.agentId,
      status: gameSessions.status,
      roomStatus: rooms.status,
    })
    .from(gameSessions)
    .innerJoin(rooms, eq(rooms.id, gameSessions.roomId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session || session.roomStatus !== "active") return { ok: false };
  if (identity.role === "ADMIN") return { ok: true, roomId: session.roomId };
  if (identity.role === "AGENT") {
    return {
      ok: session.sessionAgentId === identity.userId,
      roomId: session.roomId,
    };
  }
  if (identity.role === "USER") {
    return {
      ok: Boolean(
        identity.agentId && session.sessionAgentId === identity.agentId,
      ),
      roomId: session.roomId,
    };
  }
  return { ok: false };
}

export async function listAvailableRooms(identity: RequestIdentity) {
  if (identity.role === "ADMIN") {
    return db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        boardPriceCents: rooms.boardPriceCents,
        agentId: rooms.agentId,
      })
      .from(rooms)
      .where(eq(rooms.status, "active"))
      .orderBy(desc(rooms.createdAt));
  }

  if (identity.role === "AGENT") {
    return db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        boardPriceCents: rooms.boardPriceCents,
        agentId: rooms.agentId,
      })
      .from(rooms)
      .where(
        and(eq(rooms.status, "active"), eq(rooms.agentId, identity.userId)),
      )
      .orderBy(desc(rooms.createdAt));
  }

  if (!identity.agentId) {
    return [];
  }

  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      boardPriceCents: rooms.boardPriceCents,
      agentId: rooms.agentId,
    })
    .from(rooms)
    .where(and(eq(rooms.status, "active"), eq(rooms.agentId, identity.agentId)))
    .orderBy(desc(rooms.createdAt));
}

type HomeRoomTheme = {
  codeName: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  emoji: string;
};

const HOME_ROOM_THEMES: HomeRoomTheme[] = [
  {
    codeName: "MINK & WIN",
    gradientFrom: "#F8A900",
    gradientTo: "#F28A00",
    accent: "#FFD277",
    emoji: "💰",
  },
  {
    codeName: "EASY PLAY",
    gradientFrom: "#0BC58D",
    gradientTo: "#08A77D",
    accent: "#7EF7D5",
    emoji: "🌙",
  },
  {
    codeName: "NEON PULSE",
    gradientFrom: "#3D8BFF",
    gradientTo: "#2460E6",
    accent: "#8DC5FF",
    emoji: "👑",
  },
  {
    codeName: "HIGH STAKES",
    gradientFrom: "#08B6D8",
    gradientTo: "#0A8DC4",
    accent: "#6DEBFF",
    emoji: "🔥",
  },
];

function centsToEtbString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function homeSubtitleByName(name: string | null): string {
  if (!name) {
    return "Welcome Back To Mella";
  }
  return `Welcome Back ${name}`;
}

let homeSnapshotCounter = 0;

function nextHomeVersion(): string {
  homeSnapshotCounter = (homeSnapshotCounter + 1) % 1_000_000;
  return `${Date.now()}-${homeSnapshotCounter}`;
}

export async function getMiniHomePayload(identity: RequestIdentity) {
  const [user] = await db
    .select({
      firstName: users.firstName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);

  const [ledgerSum] = await db
    .select({
      balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
      bonusCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'referral_reward' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
    })
    .from(walletLedger)
    .where(eq(walletLedger.userId, identity.userId));

  const availableRooms = await listAvailableRooms(identity);
  const roomIds = availableRooms.map((room) => room.id);

  const liveSessions =
    roomIds.length > 0
      ? await db
          .select({
            roomId: gameSessions.roomId,
            sessionId: gameSessions.id,
            status: gameSessions.status,
          })
          .from(gameSessions)
          .where(
            and(
              inArray(gameSessions.roomId, roomIds),
              inArray(gameSessions.status, ["waiting", "countdown", "playing"]),
            ),
          )
      : [];

  const liveSessionByRoom = new Map<
    string,
    { sessionId: string; status: string }
  >();
  for (const session of liveSessions) {
    if (!liveSessionByRoom.has(session.roomId)) {
      liveSessionByRoom.set(session.roomId, {
        sessionId: session.sessionId,
        status: session.status,
      });
    }
  }

  const roomCards = availableRooms.map((room, index) => {
    const theme = HOME_ROOM_THEMES[index % HOME_ROOM_THEMES.length];
    const live = liveSessionByRoom.get(room.id);

    return {
      roomId: room.id,
      sessionId: live?.sessionId ?? null,
      sessionStatus: live?.status ?? "none",
      codeName: theme.codeName,
      title: room.name,
      description: room.description,
      priceCents: room.boardPriceCents,
      priceLabel: `${centsToEtbString(room.boardPriceCents)} ETB`,
      ctaLabel: "PLAY NOW",
      emoji: theme.emoji,
      style: {
        gradientFrom: theme.gradientFrom,
        gradientTo: theme.gradientTo,
        accent: theme.accent,
      },
    };
  });

  const displayName = user?.firstName || user?.username || "Player";
  const balanceCents = ledgerSum?.balanceCents ?? 0;
  const bonusCents = ledgerSum?.bonusCents ?? 0;

  return {
    ui: {
      appName: "Mella Bingo",
      theme: "midnight-neon",
      topActions: [
        {
          key: "refresh",
          label: "Refresh",
          icon: "refresh",
          variant: "ghost",
        },
        {
          key: "deposit",
          label: "+ DEPOSIT",
          icon: "plus",
          variant: "primary",
        },
      ],
      balanceCard: {
        title: "BALANCE",
        bonusTitle: "BONUS",
        brandWatermark: "Mella Bingo",
      },
      inviteCta: {
        icon: "users",
        label: "INVITE FRIENDS & EARN REWARDS",
      },
      section: {
        roomsTitle: "Available Rooms",
      },
      tabs: [
        { key: "play", label: "Play", icon: "gamepad", active: true },
        { key: "wallet", label: "Wallet", icon: "wallet", active: false },
        { key: "profile", label: "Profile", icon: "user", active: false },
        {
          key: "settings",
          label: "Settings",
          icon: "settings",
          active: false,
        },
      ],
    },
    user: {
      displayName,
      greetingTitle: `Hello, ${displayName}!`,
      greetingSubtitle: homeSubtitleByName(user?.firstName ?? null),
    },
    wallet: {
      currency: "ETB",
      balanceCents,
      balanceLabel: centsToEtbString(balanceCents),
      bonusCents,
      bonusLabel: centsToEtbString(bonusCents),
    },
    actions: {
      showDeposit: true,
      showInvite: true,
      inviteLabel: "INVITE FRIENDS & EARN REWARDS",
      inviteEnabled: true,
    },
    rooms: roomCards,
  };
}

export async function getMiniHomeSnapshot(identity: RequestIdentity) {
  const home = await getMiniHomePayload(identity);
  return {
    version: nextHomeVersion(),
    generatedAt: new Date().toISOString(),
    home,
  };
}

function ensureBoardMatrix(input: unknown): BoardMatrix {
  if (!Array.isArray(input) || input.length !== 5) {
    throw new Error("invalid_board_matrix");
  }

  const parsed: number[][] = input.map((row) => {
    if (!Array.isArray(row) || row.length !== 5) {
      throw new Error("invalid_board_matrix");
    }
    return row.map((cell) => {
      if (typeof cell !== "number" || !Number.isInteger(cell)) {
        throw new Error("invalid_board_matrix");
      }
      return cell;
    });
  });

  return parsed;
}

export async function buyBoards(
  identity: RequestIdentity,
  sessionId: string,
  quantity: number,
  idempotencyKey: string,
): Promise<{ created: Board[] }> {
  incCounter("board_purchase_requests_total");

  if (identity.role !== "USER") {
    throw new Error("only_user_can_buy_board");
  }

  const [session] = await db
    .select({
      id: gameSessions.id,
      roomId: gameSessions.roomId,
      status: gameSessions.status,
      sessionAgentId: gameSessions.agentId,
      boardPriceCents: rooms.boardPriceCents,
      roomStatus: rooms.status,
    })
    .from(gameSessions)
    .innerJoin(rooms, eq(rooms.id, gameSessions.roomId))
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) throw new Error("session_not_found");
  if (session.roomStatus !== "active") throw new Error("room_not_active");
  if (!(session.status === "waiting" || session.status === "countdown")) {
    throw new Error("session_not_open_for_purchase");
  }
  if (!identity.agentId || identity.agentId !== session.sessionAgentId) {
    throw new Error("forbidden_agent_scope");
  }

  const cappedQuantity = Math.min(Math.max(quantity, 1), 20);

  const purchase = await db.transaction(async (tx) => {
    const [existingPurchase] = await tx
      .select({ boardIds: boardPurchaseRequests.boardIds })
      .from(boardPurchaseRequests)
      .where(
        and(
          eq(boardPurchaseRequests.sessionId, sessionId),
          eq(boardPurchaseRequests.userId, identity.userId),
          eq(boardPurchaseRequests.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existingPurchase) {
      incCounter("board_purchase_replay_total");
      const ids = Array.isArray(existingPurchase.boardIds)
        ? (existingPurchase.boardIds as string[])
        : [];

      const created =
        ids.length > 0
          ? await tx
              .select()
              .from(boards)
              .where(
                and(eq(boards.sessionId, sessionId), inArray(boards.id, ids)),
              )
          : [];

      return { created };
    }

    const [{ maxBoardNo }] = await tx
      .select({ maxBoardNo: sql<number>`coalesce(max(${boards.boardNo}), 0)` })
      .from(boards)
      .where(eq(boards.sessionId, sessionId));

    const inserts = Array.from({ length: cappedQuantity }, (_, idx) => {
      const matrix = generateBingoBoard();
      return {
        sessionId,
        roomId: session.roomId,
        userId: identity.userId,
        boardNo: (maxBoardNo ?? 0) + idx + 1,
        boardMatrix: matrix,
        boardHash: boardHash(matrix),
        purchaseAmountCents: session.boardPriceCents,
      };
    });

    const created = await tx.insert(boards).values(inserts).returning();

    await tx.insert(boardPurchaseRequests).values({
      sessionId,
      userId: identity.userId,
      idempotencyKey,
      quantity: cappedQuantity,
      boardIds: created.map((b) => b.id),
    });

    incCounter("board_purchase_success_total");

    return { created };
  });

  // Auto-start countdown on first join so all players in the session get live timer.
  if (session.status === "waiting") {
    try {
      await autoStartSessionIfWaiting(sessionId);
    } catch {
      // Board purchase succeeded; auto-start is best-effort.
    }
  }

  return purchase;
}

export type ClaimInput = {
  sessionId: string;
  boardId: string;
  markedCells: number[];
  winningPattern: WinningPatternInput;
  idempotencyKey: string;
  clientLastSeq: number;
};

export async function callBingo(identity: RequestIdentity, input: ClaimInput) {
  incCounter("bingo_claim_requests_total");

  if (identity.role !== "USER") {
    throw new Error("only_user_can_call_bingo");
  }

  return db.transaction(async (tx) => {
    const existingClaim = await tx
      .select({
        id: bingoClaims.id,
        status: bingoClaims.status,
        rejectionReason: bingoClaims.rejectionReason,
      })
      .from(bingoClaims)
      .where(
        and(
          eq(bingoClaims.sessionId, input.sessionId),
          eq(bingoClaims.userId, identity.userId),
          eq(bingoClaims.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);

    if (existingClaim.length > 0) {
      return { replay: true, claim: existingClaim[0] };
    }

    const [session] = await tx
      .select({
        id: gameSessions.id,
        roomId: gameSessions.roomId,
        status: gameSessions.status,
        sessionAgentId: gameSessions.agentId,
      })
      .from(gameSessions)
      .where(eq(gameSessions.id, input.sessionId))
      .limit(1);

    if (!session) throw new Error("session_not_found");
    if (session.status !== "playing") throw new Error("session_not_playing");
    if (!identity.agentId || identity.agentId !== session.sessionAgentId) {
      throw new Error("forbidden_agent_scope");
    }

    const [board] = await tx
      .select({
        id: boards.id,
        boardMatrix: boards.boardMatrix,
        userId: boards.userId,
        sessionId: boards.sessionId,
      })
      .from(boards)
      .where(eq(boards.id, input.boardId))
      .limit(1);

    if (!board) throw new Error("board_not_found");
    if (board.userId !== identity.userId) throw new Error("board_not_owned");
    if (board.sessionId !== input.sessionId)
      throw new Error("board_not_in_session");

    const matrix = ensureBoardMatrix(board.boardMatrix);
    const requiredNumbers = requiredNumbersForPattern(
      matrix,
      input.winningPattern,
    );

    const calledRows = await tx
      .select({ number: sessionCalledNumbers.number })
      .from(sessionCalledNumbers)
      .where(
        and(
          eq(sessionCalledNumbers.sessionId, input.sessionId),
          inArray(sessionCalledNumbers.number, requiredNumbers),
        ),
      );

    const calledSet = new Set(calledRows.map((x) => x.number));
    const isValid = requiredNumbers.every((n) => calledSet.has(n));

    const [insertedClaim] = await tx
      .insert(bingoClaims)
      .values({
        sessionId: input.sessionId,
        roomId: session.roomId,
        userId: identity.userId,
        boardId: input.boardId,
        pattern: input.winningPattern.type,
        markedCells: input.markedCells,
        clientLastSeq: input.clientLastSeq,
        status: isValid ? "accepted" : "rejected",
        rejectionReason: isValid ? null : "pattern_numbers_not_called",
        idempotencyKey: input.idempotencyKey,
        resolvedAt: new Date(),
      })
      .returning({
        id: bingoClaims.id,
        status: bingoClaims.status,
        rejectionReason: bingoClaims.rejectionReason,
      });

    if (!isValid) {
      incCounter("bingo_claim_rejected_total");
      const io = getIo();
      io?.to(`user:${identity.userId}`).emit("bingo_rejected", {
        sessionId: input.sessionId,
        reason: "pattern_numbers_not_called",
      });
      return { replay: false, claim: insertedClaim, winner: null };
    }

    // Single-winner guarantee relies on unique(session_id) on session_winners.
    const winnerRows = await tx
      .insert(sessionWinners)
      .values({
        sessionId: input.sessionId,
        roomId: session.roomId,
        userId: identity.userId,
        boardId: input.boardId,
        claimId: insertedClaim.id,
        payoutCents: 0,
        commissionCents: 0,
      })
      .onConflictDoNothing()
      .returning({
        sessionId: sessionWinners.sessionId,
        userId: sessionWinners.userId,
      });

    if (winnerRows.length === 0) {
      incCounter("bingo_claim_rejected_total");
      await tx
        .update(bingoClaims)
        .set({
          status: "rejected",
          rejectionReason: "winner_already_declared",
          resolvedAt: new Date(),
        })
        .where(eq(bingoClaims.id, insertedClaim.id));

      const io = getIo();
      io?.to(`user:${identity.userId}`).emit("bingo_rejected", {
        sessionId: input.sessionId,
        reason: "winner_already_declared",
      });

      return {
        replay: false,
        claim: {
          ...insertedClaim,
          status: "rejected" as const,
          rejectionReason: "winner_already_declared",
        },
        winner: null,
      };
    }

    const [{ totalPotCents }] = await tx
      .select({
        totalPotCents: sql<number>`coalesce(sum(${boards.purchaseAmountCents}), 0)`,
      })
      .from(boards)
      .where(eq(boards.sessionId, input.sessionId));

    const gross = totalPotCents ?? 0;
    const commissionCents = Math.floor(
      (gross * env.AGENT_COMMISSION_BPS) / 10000,
    );
    const payoutCents = Math.max(gross - commissionCents, 0);

    await tx
      .update(sessionWinners)
      .set({ payoutCents, commissionCents })
      .where(eq(sessionWinners.claimId, insertedClaim.id));

    await tx.insert(walletLedger).values({
      userId: identity.userId,
      agentId: session.sessionAgentId,
      sessionId: input.sessionId,
      boardId: input.boardId,
      entryType: "session_win",
      amountCents: payoutCents,
      status: "posted",
      idempotencyKey: `claim-win:${insertedClaim.id}`,
      metadata: {
        claimId: insertedClaim.id,
        source: "bingo_win",
      },
    });

    if (commissionCents > 0) {
      await tx.insert(walletLedger).values({
        userId: session.sessionAgentId,
        agentId: session.sessionAgentId,
        sessionId: input.sessionId,
        boardId: input.boardId,
        entryType: "commission",
        amountCents: commissionCents,
        status: "posted",
        idempotencyKey: `claim-commission:${insertedClaim.id}`,
        metadata: {
          claimId: insertedClaim.id,
          source: "session_commission",
        },
      });
    }

    await tx
      .update(gameSessions)
      .set({
        winnerUserId: identity.userId,
        status: "finished",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, input.sessionId));

    incCounter("bingo_claim_valid_total");

    const io = getIo();
    io?.to(`session:${input.sessionId}`).emit("bingo_verified", {
      sessionId: input.sessionId,
      winnerUserId: identity.userId,
      boardId: input.boardId,
      pattern: input.winningPattern,
      payoutCents,
      commissionCents,
    });
    io?.to(`session:${input.sessionId}`).emit("game_finished", {
      sessionId: input.sessionId,
      winnerUserId: identity.userId,
      finishedAt: Date.now(),
    });

    return { replay: false, claim: insertedClaim, winner: winnerRows[0] };
  });
}
