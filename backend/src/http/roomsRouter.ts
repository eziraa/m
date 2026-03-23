import { Router } from "express";
import { eq, desc, inArray, and } from "drizzle-orm";

import { db } from "../db/client.js";
import { gameSessions, rooms } from "../db/schema.js";
import { RequestIdentity, requireAuth } from "./authMiddleware.js";
import { requireAdmin } from "./adminGuard.js";
import { requireAgent } from "./agentGuard.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ── Live-rooms cache ────────────────────────────────────────────────
const LIVE_ROOMS_CACHE_TTL_MS = 1_000;
let liveRoomsCache: { expiresAt: number; roomIds: Set<string> } | null = null;

async function getLiveRoomIdsCached(): Promise<Set<string>> {
  const now = Date.now();
  if (liveRoomsCache && now < liveRoomsCache.expiresAt) {
    return liveRoomsCache.roomIds;
  }

  const activeSessions = await db
    .select({ roomId: gameSessions.roomId, status: gameSessions.status })
    .from(gameSessions)
    .where(inArray(gameSessions.status, ["playing", "countdown"]));

  const roomIds = new Set(
    activeSessions
      .filter((s) => s.status === "playing")
      .map((s) => s.roomId)
      .filter((id): id is string => Boolean(id)),
  );

  liveRoomsCache = { expiresAt: now + LIVE_ROOMS_CACHE_TTL_MS, roomIds };
  return roomIds;
}

// ── Helpers ─────────────────────────────────────────────────────────
function centsToPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

function priceToCents(price: number): number {
  return Math.round(price * 100);
}

async function listAvailableRooms(identity: RequestIdentity) {
  if (identity.role === "ADMIN") {
    // Admin sees all active rooms
    return db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        boardPriceCents: rooms.boardPriceCents,
        agentId: rooms.agentId,
        color: rooms.color,
        icon: rooms.icon,
      })
      .from(rooms)
      .where(eq(rooms.status, "active"))
      .orderBy(desc(rooms.createdAt));
  }

  if (identity.role === "AGENT") {
    // Agent sees only their own rooms
    return db
      .select({
        id: rooms.id,
        name: rooms.name,
        description: rooms.description,
        boardPriceCents: rooms.boardPriceCents,
        agentId: rooms.agentId,
        color: rooms.color,
        icon: rooms.icon,
      })
      .from(rooms)
      .where(
        and(eq(rooms.status, "active"), eq(rooms.agentId, identity.userId)),
      )
      .orderBy(desc(rooms.createdAt));
  }

  if (identity.role === "USER") {
    if (identity.agentId) {
      // User with agent: see only rooms of their agent
      return db
        .select({
          id: rooms.id,
          name: rooms.name,
          description: rooms.description,
          boardPriceCents: rooms.boardPriceCents,
          agentId: rooms.agentId,
          color: rooms.color,
          icon: rooms.icon,
        })
        .from(rooms)
        .where(
          and(eq(rooms.status, "active"), eq(rooms.agentId, identity.agentId)),
        )
        .orderBy(desc(rooms.createdAt));
    }

    // Rooms.agentId is non-null in schema, so a USER without an agent cannot
    // match any room ownership rule in the current model.
    return [];
  }

  // Fallback: no rooms
  return [];
}
// ── GET /rooms ──────────────────────────────────────────────────────
router.get("/rooms", requireAuth, async (_req, res) => {
  try {
    // Use new logic for available rooms based on user type/agent
    const identity = _req.identity;
    const allRooms = identity ? await listAvailableRooms(identity) : [];

    const liveRoomIds = await getLiveRoomIdsCached();
    logger.info("rooms_listed", {
      requestId: _req.requestId,
      userId: identity?.userId ?? null,
      role: identity?.role ?? null,
      agentId: identity?.agentId ?? null,
      count: allRooms.length,
    });

    return res.json({
      rooms: allRooms.map((room) => ({
        ...room,
        price: centsToPrice(room.boardPriceCents),
        isLive: liveRoomIds.has(room.id),
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "list_rooms_failed";
    logger.error("rooms_list_failed", {
      requestId: _req.requestId,
      userId: _req.identity?.userId ?? null,
      role: _req.identity?.role ?? null,
      agentId: _req.identity?.agentId ?? null,
      message,
    });
    return res.status(500).json({ error: message });
  }
});

// ── GET /rooms/:id ──────────────────────────────────────────────────
router.get("/rooms/:id", requireAuth, async (req, res) => {
  try {
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, req.params.id as string))
      .limit(1);

    if (!room) {
      return res.status(404).json({ error: "room_not_found" });
    }

    return res.json({
      room: { ...room, price: centsToPrice(room.boardPriceCents) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "get_room_failed";
    return res.status(500).json({ error: message });
  }
});

// ── POST /rooms ─────────────────────────────────────────────────────
router.post("/rooms", requireAuth, requireAdmin, async (req, res) => {
  const {
    name,
    price,
    description,
    minPlayers,
    maxPlayers,
    color,
    icon,
    botAllowed = false,
  } = req.body;

  if (!name || price == null) {
    return res.status(400).json({ error: "name_and_price_required" });
  }

  try {
    const agentId = req.identity!.userId;

    const [room] = await db
      .insert(rooms)
      .values({
        agentId,
        name,
        boardPriceCents: priceToCents(Number(price)),
        description: description || null,
        minPlayers: minPlayers || 2,
        maxPlayers: maxPlayers || 10,
        color: color || "from-blue-400 to-blue-600",
        icon: icon || null,
        botAllowed: Boolean(botAllowed),
      })
      .returning();

    return res.json({
      room: { ...room, price: centsToPrice(room.boardPriceCents) },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "create_room_failed";
    return res.status(500).json({ error: message });
  }
});

// ── PUT /rooms/:id ──────────────────────────────────────────────────
router.put("/rooms/:id", requireAuth, requireAgent, async (req, res) => {
  console.log("@@ req body", req.body);
  const {
    name,
    price,
    description,
    minPlayers,
    maxPlayers,
    color,
    icon,
    botAllowed,
  } = req.body;

  try {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) patch.name = name;
    if (price !== undefined)
      patch.boardPriceCents = priceToCents(Number(price));
    if (description !== undefined) patch.description = description;
    if (minPlayers !== undefined) patch.minPlayers = minPlayers;
    if (maxPlayers !== undefined) patch.maxPlayers = maxPlayers;
    if (color !== undefined) patch.color = color;
    if (icon !== undefined) patch.icon = icon;
    if (botAllowed !== undefined) patch.botAllowed = botAllowed;

    const agentId = req.identity!.userId;

    console.log("@@ patch", patch);

    const [room] = await db
      .update(rooms)
      .set(patch)
      .where(eq(rooms.id, req.params.id as string))
      .returning();

    if (!room) {
      return res.status(404).json({ error: "room_not_found" });
    }

    return res.json({
      room: { ...room, price: centsToPrice(room.boardPriceCents) },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "update_room_failed";
    return res.status(500).json({ error: message });
  }
});

// ── PATCH /rooms/:id/bot-allowed ────────────────────────────────────
router.patch(
  "/rooms/:id/bot-allowed",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { botAllowed } = req.body as { botAllowed?: unknown };

    if (typeof botAllowed !== "boolean") {
      return res.status(400).json({ error: "botAllowed_must_be_boolean" });
    }

    try {
      const [room] = await db
        .update(rooms)
        .set({ botAllowed, updatedAt: new Date() })
        .where(eq(rooms.id, req.params.id as string))
        .returning();

      if (!room) {
        return res.status(404).json({ error: "room_not_found" });
      }

      return res.json({
        room: { ...room, price: centsToPrice(room.boardPriceCents) },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "toggle_bot_allowed_failed";
      return res.status(500).json({ error: message });
    }
  },
);

// ── DELETE /rooms/:id ───────────────────────────────────────────────
router.delete("/rooms/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [room] = await db
      .delete(rooms)
      .where(eq(rooms.id, req.params.id as string))
      .returning();

    if (!room) {
      return res.status(404).json({ error: "room_not_found" });
    }

    return res.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "delete_room_failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
