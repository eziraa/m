import { Router } from "express";
import { z } from "zod";

import { requireAdmin } from "./adminGuard.js";
import { asyncHandler } from "./asyncHandler.js";
import { requireAuth } from "./authMiddleware.js";
import {
  amountToCents,
  approvePendingDeposit,
  centsToAmount,
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  nonNegativeAmountToCents,
  percentageToBps,
  updatePromoCode,
} from "../wallet/depositService.js";

const promoCreateSchema = z
  .object({
    code: z.string().trim().min(3).max(64),
    bonusType: z.enum(["percentage", "fixed"]),
    bonusValue: z.number().positive(),
    maxUsers: z.number().int().positive(),
    minimumDeposit: z.number().min(0).default(0),
    maximumBonusCap: z.number().positive(),
    expiryDate: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const promoPatchSchema = z
  .object({
    code: z.string().trim().min(3).max(64).optional(),
    bonusType: z.enum(["percentage", "fixed"]).optional(),
    bonusValue: z.number().positive().optional(),
    maxUsers: z.number().int().positive().optional(),
    minimumDeposit: z.number().min(0).optional(),
    maximumBonusCap: z.number().positive().optional(),
    expiryDate: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.bonusType === undefined && value.bonusValue === undefined) ||
      (value.bonusType !== undefined && value.bonusValue !== undefined),
    {
      message: "bonus_type_and_bonus_value_must_be_provided_together",
      path: ["bonusValue"],
    },
  );

const router = Router();

router.post(
  "/admin/promocodes",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = promoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    try {
      const created = await createPromoCode({
        code: data.code,
        bonusType: data.bonusType,
        bonusValueBps:
          data.bonusType === "percentage"
            ? percentageToBps(data.bonusValue)
            : null,
        bonusValueCents:
          data.bonusType === "fixed" ? amountToCents(data.bonusValue) : null,
        maxUsers: data.maxUsers,
        minimumDepositCents: nonNegativeAmountToCents(data.minimumDeposit),
        maximumBonusCapCents: amountToCents(data.maximumBonusCap),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive,
      });

      res.status(201).json({
        ok: true,
        promoCode: {
          ...created,
          bonusValue:
            created.bonusType === "percentage"
              ? (created.bonusValueBps ?? 0) / 100
              : centsToAmount(created.bonusValueCents ?? 0),
          minimumDeposit: centsToAmount(created.minimumDepositCents),
          maximumBonusCap: centsToAmount(created.maximumBonusCapCents),
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "promo_create_failed";
      const status = reason.includes("uq_promo_codes_code") ? 409 : 500;
      res.status(status).json({ error: reason });
    }
  }),
);

router.get(
  "/admin/promocodes",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await listPromoCodes();

    res.status(200).json({
      ok: true,
      promoCodes: rows.map((row) => ({
        ...row,
        bonusValue:
          row.bonusType === "percentage"
            ? (row.bonusValueBps ?? 0) / 100
            : centsToAmount(row.bonusValueCents ?? 0),
        minimumDeposit: centsToAmount(row.minimumDepositCents),
        maximumBonusCap: centsToAmount(row.maximumBonusCapCents),
      })),
    });
  }),
);

router.patch(
  "/admin/promocodes/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = promoPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const patch = parsed.data;

    const updated = await updatePromoCode(String(req.params.id), {
      code: patch.code,
      bonusType: patch.bonusType,
      bonusValueBps:
        patch.bonusType === "percentage" && patch.bonusValue !== undefined
          ? percentageToBps(patch.bonusValue)
          : undefined,
      bonusValueCents:
        patch.bonusType === "fixed" && patch.bonusValue !== undefined
          ? amountToCents(patch.bonusValue)
          : undefined,
      maxUsers: patch.maxUsers,
      minimumDepositCents:
        patch.minimumDeposit !== undefined
          ? nonNegativeAmountToCents(patch.minimumDeposit)
          : undefined,
      maximumBonusCapCents:
        patch.maximumBonusCap !== undefined
          ? amountToCents(patch.maximumBonusCap)
          : undefined,
      expiryDate:
        patch.expiryDate === undefined
          ? undefined
          : patch.expiryDate
            ? new Date(patch.expiryDate)
            : null,
      isActive: patch.isActive,
    });

    if (!updated) {
      res.status(404).json({ error: "promo_not_found" });
      return;
    }

    res.status(200).json({ ok: true, promoCode: updated });
  }),
);

router.delete(
  "/admin/promocodes/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const removed = await deletePromoCode(String(req.params.id));
    if (!removed) {
      res.status(404).json({ error: "promo_not_found" });
      return;
    }

    res.status(200).json({ ok: true, promoCode: removed });
  }),
);

router.post(
  "/admin/deposits/:id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!req.identity) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    try {
      const result = await approvePendingDeposit(
        String(req.params.id),
        req.identity.userId,
      );
      res.status(200).json({
        ok: true,
        deposit: {
          ...result.deposit,
          amount: centsToAmount(result.deposit.amountCents),
          status: result.deposit.status.toUpperCase(),
        },
        promo: {
          ...result.promo,
          bonusAmount: centsToAmount(result.promo.bonusAmountCents),
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "deposit_approve_failed";
      const status = reason.includes("deposit_not_found")
        ? 404
        : reason.includes("deposit_already_processed")
          ? 409
          : 500;
      res.status(status).json({ error: reason });
    }
  }),
);

export default router;
