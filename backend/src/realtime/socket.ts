import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { authenticateSocket } from "../auth/socketAuth.js";
import { env } from "../config/env.js";
import {
  buyBoards,
  callBingo,
  canJoinRoom,
  canJoinSession,
  getMiniHomeSnapshot,
} from "../game/gameService.js";
import {
  getBoardSelectionState,
  getSessionDelta,
  getSessionState,
} from "../game/sessionRunner.js";
import { isAllowedOrigin } from "../utils/cors.js";
import { checkRateLimit } from "../utils/rateLimit.js";
import { setIo } from "./ioHub.js";

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("cors_origin_not_allowed"), false);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  setIo(io);

  io.use((socket, next) => {
    const identity = authenticateSocket(socket);
    if (!identity) {
      next(new Error("unauthorized"));
      return;
    }

    socket.data.identity = identity;
    next();
  });

  io.on("connection", (socket) => {
    const identity = socket.data.identity as {
      userId: string;
      role: "ADMIN" | "AGENT" | "USER";
      telegramId: string;
      agentId: string | null;
    };

    socket.join(`user:${identity.userId}`);
    if (identity.agentId) {
      socket.join(`agent:${identity.agentId}`);
    }

    const passSocketRateLimit = async (event: string) => {
      const rate = await checkRateLimit({
        key: `rl:socket:${identity.userId}:${event}`,
        max: env.SOCKET_RATE_LIMIT_MAX,
        windowSec: env.SOCKET_RATE_LIMIT_WINDOW_SEC,
      });

      if (!rate.allowed) {
        socket.emit("rate_limited", {
          event,
          retryAfterSec: rate.retryAfterSec,
        });
        return false;
      }
      return true;
    };

    socket.on("get_home", async () => {
      if (!(await passSocketRateLimit("get_home"))) return;

      try {
        const snapshot = await getMiniHomeSnapshot(identity);
        socket.emit("home_snapshot", { ...snapshot, serverTime: Date.now() });
      } catch {
        socket.emit("home_snapshot_failed", { reason: "home_fetch_failed" });
      }
    });

    socket.on("join_room", async (payload: { roomId?: string }) => {
      if (!(await passSocketRateLimit("join_room"))) return;
      if (!payload?.roomId) return;

      const allowed = await canJoinRoom(identity, payload.roomId);
      if (!allowed) {
        socket.emit("join_denied", { type: "room", roomId: payload.roomId });
        return;
      }

      socket.join(`room:${payload.roomId}`);
      socket.emit("room_joined", {
        roomId: payload.roomId,
        serverTime: Date.now(),
      });
    });

    socket.on("join_session", async (payload: { sessionId?: string }) => {
      if (!(await passSocketRateLimit("join_session"))) return;
      if (!payload?.sessionId) return;

      const joinResult = await canJoinSession(identity, payload.sessionId);
      if (!joinResult.ok) {
        socket.emit("join_denied", {
          type: "session",
          sessionId: payload.sessionId,
        });
        return;
      }

      socket.join(`session:${payload.sessionId}`);
      if (joinResult.roomId) {
        socket.join(`room:${joinResult.roomId}`);
      }
      try {
        const [snapshot, boardSelection] = await Promise.all([
          getSessionState(identity, payload.sessionId),
          getBoardSelectionState(identity, payload.sessionId),
        ]);
        socket.emit("session_snapshot", {
          sessionId: snapshot.id,
          status: snapshot.status,
          currentNumber: snapshot.currentNumber,
          lastSeq: snapshot.currentSeq,
          recentCalls: snapshot.recentCalls,
          startsInSec: boardSelection.startsInSec,
        });
      } catch {
        socket.emit("session_snapshot", {
          sessionId: payload.sessionId,
          status: "waiting",
          currentNumber: null,
          lastSeq: 0,
          recentCalls: [],
          startsInSec: 0,
        });
      }
    });

    socket.on(
      "sync_me",
      async (payload: { sessionId?: string; lastSeq?: number }) => {
        if (!(await passSocketRateLimit("sync_me"))) return;
        if (!payload?.sessionId || typeof payload.lastSeq !== "number") {
          socket.emit("sync_failed", { reason: "invalid_payload" });
          return;
        }

        const joinResult = await canJoinSession(identity, payload.sessionId);
        if (!joinResult.ok) {
          socket.emit("join_denied", {
            type: "session",
            sessionId: payload.sessionId,
          });
          return;
        }

        const delta = await getSessionDelta(
          identity,
          payload.sessionId,
          payload.lastSeq,
        );
        socket.emit("session_delta", delta);
      },
    );

    socket.on(
      "buy_board",
      async (payload: {
        sessionId?: string;
        quantity?: number;
        idempotencyKey?: string;
      }) => {
        if (!(await passSocketRateLimit("buy_board"))) return;
        if (
          !payload?.sessionId ||
          typeof payload.idempotencyKey !== "string" ||
          payload.idempotencyKey.length < 8
        ) {
          socket.emit("buy_board_failed", { reason: "invalid_payload" });
          return;
        }

        try {
          const result = await buyBoards(
            identity,
            payload.sessionId,
            typeof payload.quantity === "number" ? payload.quantity : 1,
            payload.idempotencyKey,
          );

          socket.emit("board_purchased", {
            sessionId: payload.sessionId,
            boards: result.created,
          });

          const snapshot = await getMiniHomeSnapshot(identity);
          io.to(`user:${identity.userId}`).emit("home_snapshot", {
            ...snapshot,
            serverTime: Date.now(),
          });
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "buy_board_failed";
          socket.emit("buy_board_failed", { reason });
        }
      },
    );

    socket.on(
      "call_bingo",
      async (payload: {
        sessionId?: string;
        boardId?: string;
        markedCells?: number[];
        winningPattern?: {
          type: "row" | "column" | "diagonal" | "full_house";
          index?: number;
          diagonal?: "main" | "anti";
        };
        idempotencyKey?: string;
        clientLastSeq?: number;
      }) => {
        if (!(await passSocketRateLimit("call_bingo"))) return;
        if (
          !payload?.sessionId ||
          !payload.boardId ||
          !Array.isArray(payload.markedCells) ||
          !payload.winningPattern ||
          typeof payload.idempotencyKey !== "string" ||
          typeof payload.clientLastSeq !== "number"
        ) {
          socket.emit("bingo_rejected", {
            sessionId: payload?.sessionId,
            reason: "invalid_payload",
          });
          return;
        }

        try {
          const result = await callBingo(identity, {
            sessionId: payload.sessionId,
            boardId: payload.boardId,
            markedCells: payload.markedCells,
            winningPattern: payload.winningPattern,
            idempotencyKey: payload.idempotencyKey,
            clientLastSeq: payload.clientLastSeq,
          });

          if (!result.winner) {
            socket.emit("bingo_rejected", {
              sessionId: payload.sessionId,
              reason: result.claim.rejectionReason ?? "claim_rejected",
            });
            return;
          }

          socket.emit("bingo_ack", {
            sessionId: payload.sessionId,
            claimId: result.claim.id,
            status: result.claim.status,
          });

          const snapshot = await getMiniHomeSnapshot(identity);
          io.to(`user:${identity.userId}`).emit("home_snapshot", {
            ...snapshot,
            serverTime: Date.now(),
          });
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "claim_failed";
          socket.emit("bingo_rejected", {
            sessionId: payload.sessionId,
            reason,
          });
        }
      },
    );
  });

  return io;
}

export async function closeSocketServer(io: Server) {
  io.removeAllListeners();
  io.close();
}
