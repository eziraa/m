import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "./authMiddleware.js";
import {
  buyBoards,
  callBingo,
  getMiniHomeSnapshot,
  leaveSessionBeforeStart,
  listAvailableRooms,
} from "../game/gameService.js";
import {
  getBoardSelectionState,
  resolveOrCreateActiveSessionByRoomId,
  resolveOrCreateActiveSessionByRoomName,
  getSessionState,
  startSession,
  stopSession,
} from "../game/sessionRunner.js";

const buyBoardSchema = z.object({
  sessionId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  idempotencyKey: z.string().min(8).max(128),
});

const bingoSchema = z.object({
  sessionId: z.string().uuid(),
  boardId: z.string().uuid(),
  markedCells: z.array(z.number().int()).max(25),
  winningPattern: z.object({
    type: z.enum(["row", "column", "diagonal", "full_house", "corners"]),
    index: z.number().int().min(0).max(4).optional(),
    diagonal: z.enum(["main", "anti"]).optional(),
  }),
  idempotencyKey: z.string().min(8).max(128),
  clientLastSeq: z.number().int().min(0),
});

const resolveSessionSchema = z.object({
  roomName: z.string().min(1).max(160),
});

const router = Router();

router.get("/rooms/available", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const rooms = await listAvailableRooms(req.identity);
  res.status(200).json({ ok: true, rooms });
});

router.get("/mini/home", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const snapshot = await getMiniHomeSnapshot(req.identity);
    res.status(200).json({ ok: true, ...snapshot });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "mini_home_failed";
    res.status(500).json({ error: reason });
  }
});

router.post("/sessions/resolve-active", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = resolveSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const state = await resolveOrCreateActiveSessionByRoomName(
      req.identity,
      parsed.data.roomName,
    );
    res.status(200).json({ ok: true, state });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "resolve_active_session_failed";

    if (reason.includes("forbidden")) {
      res.status(403).json({ error: reason });
      return;
    }

    if (reason.includes("room_not_found")) {
      res.status(404).json({ error: reason });
      return;
    }

    if (reason.includes("room_name_required")) {
      res.status(400).json({ error: reason });
      return;
    }

    res.status(500).json({ error: reason });
  }
});

router.get("/rooms/:roomId/active-session", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const roomId = String(req.params.roomId);
    const state = await resolveOrCreateActiveSessionByRoomId(
      req.identity,
      roomId,
    );
    res.status(200).json({ ok: true, state });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "resolve_active_session_failed";

    if (reason.includes("forbidden")) {
      res.status(403).json({ error: reason });
      return;
    }

    if (reason.includes("room_not_found")) {
      res.status(404).json({ error: reason });
      return;
    }

    res.status(500).json({ error: reason });
  }
});

router.post("/sessions/boards/buy", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = buyBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const result = await buyBoards(
      req.identity,
      parsed.data.sessionId,
      parsed.data.quantity,
      parsed.data.idempotencyKey,
    );
    res.status(201).json({ ok: true, boards: result.created });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "buy_board_failed";
    if (reason.includes("forbidden") || reason.includes("only_user")) {
      res.status(403).json({ error: reason });
      return;
    }
    if (
      reason.includes("not_found") ||
      reason.includes("not_open") ||
      reason.includes("not_active")
    ) {
      res.status(409).json({ error: reason });
      return;
    }
    res.status(500).json({ error: reason });
  }
});

router.post("/sessions/:sessionId/leave", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const sessionId = String(req.params.sessionId);
    const result = await leaveSessionBeforeStart(req.identity, sessionId);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "leave_session_failed";

    if (reason.includes("forbidden") || reason.includes("only_user")) {
      res.status(403).json({ error: reason });
      return;
    }
    if (
      reason.includes("not_found") ||
      reason.includes("not_open") ||
      reason.includes("not_active")
    ) {
      res.status(409).json({ error: reason });
      return;
    }
    res.status(500).json({ error: reason });
  }
});

router.post(
  "/agent/sessions/:sessionId/start",
  requireAuth,
  async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    try {
      const sessionId = String(req.params.sessionId);
      const result = await startSession(req.identity, sessionId);
      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "session_start_failed";
      if (reason.includes("forbidden")) {
        res.status(403).json({ error: reason });
        return;
      }
      if (reason.includes("not_found") || reason.includes("not_waiting")) {
        res.status(409).json({ error: reason });
        return;
      }
      res.status(500).json({ error: reason });
    }
  },
);

router.post(
  "/agent/sessions/:sessionId/stop",
  requireAuth,
  async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    try {
      const sessionId = String(req.params.sessionId);
      const result = await stopSession(req.identity, sessionId);
      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "session_stop_failed";
      if (reason.includes("forbidden")) {
        res.status(403).json({ error: reason });
        return;
      }
      if (reason.includes("not_found")) {
        res.status(409).json({ error: reason });
        return;
      }
      res.status(500).json({ error: reason });
    }
  },
);

router.get("/sessions/:sessionId/state", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const sessionId = String(req.params.sessionId);
    const state = await getSessionState(req.identity, sessionId);
    res.status(200).json({ ok: true, state });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "session_state_failed";
    if (reason.includes("forbidden")) {
      res.status(403).json({ error: reason });
      return;
    }
    if (reason.includes("not_found")) {
      res.status(404).json({ error: reason });
      return;
    }
    res.status(500).json({ error: reason });
  }
});

router.get(
  "/sessions/:sessionId/board-selection",
  requireAuth,
  async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    try {
      const sessionId = String(req.params.sessionId);
      const state = await getBoardSelectionState(req.identity, sessionId);
      res.status(200).json({ ok: true, state });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "board_selection_state_failed";
      if (reason.includes("forbidden")) {
        res.status(403).json({ error: reason });
        return;
      }
      if (reason.includes("not_found")) {
        res.status(404).json({ error: reason });
        return;
      }
      res.status(500).json({ error: reason });
    }
  },
);

router.post("/sessions/bingo-claims", requireAuth, async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = bingoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const result = await callBingo(req.identity, parsed.data);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "claim_failed";
    if (reason.includes("forbidden") || reason.includes("only_user")) {
      res.status(403).json({ error: reason });
      return;
    }
    if (
      reason.includes("not_found") ||
      reason.includes("not_playing") ||
      reason.includes("not_owned")
    ) {
      res.status(409).json({ error: reason });
      return;
    }
    res.status(500).json({ error: reason });
  }
});

export default router;
