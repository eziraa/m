import { Router } from "express";
import { z } from "zod";

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

export default router;
