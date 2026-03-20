import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db/client.js";
import { walletLedger, withdrawals } from "../db/schema.js";
import { asyncHandler } from "./asyncHandler.js";
import { requireAuth } from "./authMiddleware.js";
import {
  centsToAmount,
  createPendingDeposit,
} from "../wallet/depositService.js";

const createDepositSchema = z.object({
  amount: z.number().positive(),
  promoCode: z.string().trim().max(64).nullable().optional(),
});

const router = Router();

router.post(
  "/wallet/deposit",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (req.identity.role !== "USER") {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const parsed = createDepositSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    try {
      const created = await createPendingDeposit(
        req.identity.userId,
        parsed.data.amount,
        parsed.data.promoCode ?? null,
      );

      res.status(201).json({
        ok: true,
        deposit: {
          id: created.id,
          userId: created.userId,
          amount: centsToAmount(created.amountCents),
          promoCode: created.promoCode,
          status: created.status.toUpperCase(),
          createdAt: created.createdAt,
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "deposit_create_failed";
      const status = reason.includes("invalid_amount") ? 400 : 500;
      res.status(status).json({ error: reason });
    }
  }),
);

router.post(
  "/wallet/withdraw",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (req.identity.role !== "USER") {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const { amount, phone } = req.body;
    const amountCents = Math.round(Number(amount) * 100);

    if (isNaN(amountCents) || amountCents <= 0) {
      res.status(400).json({ error: "invalid_amount" });
      return;
    }

    if (!phone) {
      res.status(400).json({ error: "phone_required" });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        // Calculate current posted balance
        const [summary] = await tx
          .select({
            balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
          })
          .from(walletLedger)
          .where(eq(walletLedger.userId, req.identity!.userId));

        // Calculate pending withdrawals to "lock" those funds
        const [pendingSummary] = await tx
          .select({
            amountCents: sql<number>`coalesce(sum(${withdrawals.amountCents}), 0)`,
          })
          .from(withdrawals)
          .where(
            and(
              eq(withdrawals.userId, req.identity!.userId),
              eq(withdrawals.status, "pending"),
            ),
          );

        const availableBalance =
          (summary?.balanceCents ?? 0) - (pendingSummary?.amountCents ?? 0);

        if (availableBalance < amountCents) {
          throw new Error("insufficient_funds");
        }

        await tx.insert(withdrawals).values({
          userId: req.identity!.userId,
          amountCents,
          phone,
          status: "pending",
        });
      });

      res.status(200).json({ ok: true, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "withdraw_failed";
      res.status(400).json({ error: message });
    }
  }),
);

export default router;
