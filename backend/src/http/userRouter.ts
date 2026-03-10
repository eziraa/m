import { and, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db/client.js";
import { users, walletLedger } from "../db/schema.js";
import { asyncHandler } from "./asyncHandler.js";
import { requireAuth } from "./authMiddleware.js";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(64).optional(),
  lastName: z.string().min(1).max(64).optional(),
  username: z.string().min(3).max(64).optional(),
});

const router = Router();

router.get(
  "/me/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const [profile] = await db
      .select({
        id: users.id,
        role: users.role,
        telegramId: users.telegramId,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        referredByAgentId: users.referredByAgentId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.identity.userId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "profile_not_found" });
      return;
    }

    res.status(200).json({ ok: true, profile });
  }),
);

router.patch(
  "/me/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const patch = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "empty_patch" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, req.identity.userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        updatedAt: users.updatedAt,
      });

    res.status(200).json({ ok: true, profile: updated });
  }),
);

router.get(
  "/me/wallet",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const [summary] = await db
      .select({
        balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        bonusCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'referral_reward' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
      })
      .from(walletLedger)
      .where(eq(walletLedger.userId, req.identity.userId));

    res.status(200).json({
      ok: true,
      wallet: {
        currency: "ETB",
        balanceCents: summary?.balanceCents ?? 0,
        bonusCents: summary?.bonusCents ?? 0,
      },
    });
  }),
);

router.get(
  "/me/wallet/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const limitRaw = Number(req.query.limit ?? 30);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(Math.floor(limitRaw), 100))
      : 30;

    const rows = await db
      .select({
        id: walletLedger.id,
        entryType: walletLedger.entryType,
        amountCents: walletLedger.amountCents,
        status: walletLedger.status,
        createdAt: walletLedger.createdAt,
        metadata: walletLedger.metadata,
        sessionId: walletLedger.sessionId,
        boardId: walletLedger.boardId,
      })
      .from(walletLedger)
      .where(eq(walletLedger.userId, req.identity.userId))
      .orderBy(desc(walletLedger.createdAt))
      .limit(limit);

    res.status(200).json({ ok: true, transactions: rows });
  }),
);

router.get(
  "/me/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const [summary] = await db
      .select({
        totalTransactions: sql<number>`count(*)`,
        winsCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'session_win' then ${walletLedger.amountCents} else 0 end), 0)`,
        commissionsCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'commission' then ${walletLedger.amountCents} else 0 end), 0)`,
      })
      .from(walletLedger)
      .where(
        and(
          eq(walletLedger.userId, req.identity.userId),
          eq(walletLedger.status, "posted"),
        ),
      );

    res.status(200).json({ ok: true, dashboard: summary });
  }),
);

export default router;
