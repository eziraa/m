import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  deposits,
  promoCodes,
  promoCodeUsages,
  walletLedger,
} from "../db/schema.js";

type BonusType = "percentage" | "fixed";

type PromoResult = {
  applied: boolean;
  code: string | null;
  reason:
    | "none"
    | "promo_not_found"
    | "inactive"
    | "expired"
    | "minimum_not_met"
    | "exhausted"
    | "already_used_by_user"
    | "applied";
  bonusAmountCents: number;
};

export type CreatePromoCodeInput = {
  code: string;
  bonusType: BonusType;
  bonusValueBps: number | null;
  bonusValueCents: number | null;
  maxUsers: number;
  minimumDepositCents: number;
  maximumBonusCapCents: number;
  expiryDate: Date | null;
  isActive: boolean;
};

export type UpdatePromoCodeInput = {
  code?: string;
  bonusType?: BonusType;
  bonusValueBps?: number | null;
  bonusValueCents?: number | null;
  maxUsers?: number;
  minimumDepositCents?: number;
  maximumBonusCapCents?: number;
  expiryDate?: Date | null;
  isActive?: boolean;
};

export function normalizePromoCode(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredPromoCode(value: string): string {
  const normalized = normalizePromoCode(value);
  if (!normalized) {
    throw new Error("invalid_promo_code");
  }
  return normalized;
}

export function amountToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("invalid_amount");
  }
  const cents = Math.round(amount * 100);
  if (cents <= 0) {
    throw new Error("invalid_amount");
  }
  return cents;
}

export function nonNegativeAmountToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("invalid_amount");
  }
  const cents = Math.round(amount * 100);
  if (cents < 0) {
    throw new Error("invalid_amount");
  }
  return cents;
}

export function percentageToBps(percentage: number): number {
  if (!Number.isFinite(percentage)) {
    throw new Error("invalid_bonus_percentage");
  }
  const bps = Math.round(percentage * 100);
  if (bps <= 0) {
    throw new Error("invalid_bonus_percentage");
  }
  return bps;
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}

export async function createPendingDeposit(
  userId: string,
  amount: number,
  promoCodeRaw: string | null,
) {
  const amountCents = amountToCents(amount);
  const promoCode = normalizePromoCode(promoCodeRaw);

  const [created] = await db
    .insert(deposits)
    .values({
      userId,
      amountCents,
      promoCode,
      status: "pending",
    })
    .returning();

  return created;
}

export async function createPromoCode(input: CreatePromoCodeInput) {
  const [created] = await db
    .insert(promoCodes)
    .values({
      code: normalizeRequiredPromoCode(input.code),
      bonusType: input.bonusType,
      bonusValueBps: input.bonusValueBps,
      bonusValueCents: input.bonusValueCents,
      maxUsers: input.maxUsers,
      minimumDepositCents: input.minimumDepositCents,
      maximumBonusCapCents: input.maximumBonusCapCents,
      expiryDate: input.expiryDate,
      isActive: input.isActive,
    })
    .returning();

  return created;
}

export async function listPromoCodes() {
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function updatePromoCode(id: string, patch: UpdatePromoCodeInput) {
  const [updated] = await db
    .update(promoCodes)
    .set({
      ...patch,
      code: patch.code ? normalizeRequiredPromoCode(patch.code) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(promoCodes.id, id))
    .returning();

  return updated ?? null;
}

export async function deletePromoCode(id: string) {
  const [updated] = await db
    .update(promoCodes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(promoCodes.id, id))
    .returning({ id: promoCodes.id, isActive: promoCodes.isActive });

  return updated ?? null;
}

function computeBonusAmountCents(
  depositAmountCents: number,
  bonusType: BonusType,
  bonusValueBps: number | null,
  bonusValueCents: number | null,
  maximumBonusCapCents: number,
): number {
  const rawBonusCents =
    bonusType === "percentage"
      ? Math.floor((depositAmountCents * (bonusValueBps ?? 0)) / 10000)
      : (bonusValueCents ?? 0);

  return Math.max(0, Math.min(rawBonusCents, maximumBonusCapCents));
}

async function claimAndApplyPromo(
  tx: any,
  deposit: {
    id: string;
    userId: string;
    amountCents: number;
    promoCode: string | null;
  },
): Promise<PromoResult> {
  if (!deposit.promoCode) {
    return {
      applied: false,
      code: null,
      reason: "none",
      bonusAmountCents: 0,
    };
  }

  const code = deposit.promoCode;

  const existingUsage = await tx
    .select({ id: promoCodeUsages.id })
    .from(promoCodeUsages)
    .innerJoin(promoCodes, eq(promoCodes.id, promoCodeUsages.promoCodeId))
    .where(
      and(
        eq(promoCodes.code, code),
        eq(promoCodeUsages.userId, deposit.userId),
      ),
    )
    .limit(1);

  if (existingUsage.length > 0) {
    return {
      applied: false,
      code,
      reason: "already_used_by_user",
      bonusAmountCents: 0,
    };
  }

  const claimed = await tx.execute(sql<{
    id: string;
    code: string;
    bonus_type: BonusType;
    bonus_value_bps: number | null;
    bonus_value_cents: number | null;
    maximum_bonus_cap_cents: number;
  }>`
    update ${promoCodes}
    set used_count = ${promoCodes.usedCount} + 1,
        updated_at = now()
    where ${promoCodes.code} = ${code}
      and ${promoCodes.isActive} = true
      and (${promoCodes.expiryDate} is null or ${promoCodes.expiryDate} > now())
      and ${promoCodes.minimumDepositCents} <= ${deposit.amountCents}
      and ${promoCodes.usedCount} < ${promoCodes.maxUsers}
    returning
      ${promoCodes.id} as id,
      ${promoCodes.code} as code,
      ${promoCodes.bonusType} as bonus_type,
      ${promoCodes.bonusValueBps} as bonus_value_bps,
      ${promoCodes.bonusValueCents} as bonus_value_cents,
      ${promoCodes.maximumBonusCapCents} as maximum_bonus_cap_cents
  `);

  const claimedPromo = claimed.rows[0];

  if (!claimedPromo) {
    const [lookup] = await tx
      .select({
        isActive: promoCodes.isActive,
        expiryDate: promoCodes.expiryDate,
        minimumDepositCents: promoCodes.minimumDepositCents,
        usedCount: promoCodes.usedCount,
        maxUsers: promoCodes.maxUsers,
      })
      .from(promoCodes)
      .where(eq(promoCodes.code, code))
      .limit(1);

    if (!lookup) {
      return {
        applied: false,
        code,
        reason: "promo_not_found",
        bonusAmountCents: 0,
      };
    }

    if (!lookup.isActive) {
      return {
        applied: false,
        code,
        reason: "inactive",
        bonusAmountCents: 0,
      };
    }

    if (lookup.expiryDate && lookup.expiryDate.getTime() <= Date.now()) {
      return {
        applied: false,
        code,
        reason: "expired",
        bonusAmountCents: 0,
      };
    }

    if (lookup.minimumDepositCents > deposit.amountCents) {
      return {
        applied: false,
        code,
        reason: "minimum_not_met",
        bonusAmountCents: 0,
      };
    }

    if (lookup.usedCount >= lookup.maxUsers) {
      return {
        applied: false,
        code,
        reason: "exhausted",
        bonusAmountCents: 0,
      };
    }

    return {
      applied: false,
      code,
      reason: "exhausted",
      bonusAmountCents: 0,
    };
  }

  const bonusAmountCents = computeBonusAmountCents(
    deposit.amountCents,
    claimedPromo.bonus_type,
    claimedPromo.bonus_value_bps,
    claimedPromo.bonus_value_cents,
    claimedPromo.maximum_bonus_cap_cents,
  );

  if (bonusAmountCents <= 0) {
    await tx
      .update(promoCodes)
      .set({
        usedCount: sql`${promoCodes.usedCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(promoCodes.id, claimedPromo.id));

    return {
      applied: false,
      code,
      reason: "minimum_not_met",
      bonusAmountCents: 0,
    };
  }

  await tx.insert(promoCodeUsages).values({
    userId: deposit.userId,
    promoCodeId: claimedPromo.id,
    depositId: deposit.id,
    bonusAmountCents,
  });

  await tx.insert(walletLedger).values({
    userId: deposit.userId,
    entryType: "adjustment",
    amountCents: bonusAmountCents,
    status: "posted",
    idempotencyKey: `deposit-promo-bonus:${deposit.id}`,
    metadata: {
      source: "deposit_promo_bonus",
      promoCodeId: claimedPromo.id,
      promoCode: claimedPromo.code,
      depositId: deposit.id,
    },
  });

  return {
    applied: true,
    code,
    reason: "applied",
    bonusAmountCents,
  };
}

type DbTransaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

export async function approvePendingDepositInTx(
  tx: DbTransaction,
  depositId: string,
  adminId: string,
) {
  const locked = await tx.execute(sql`
    select
      ${deposits.id} as id,
      ${deposits.userId} as user_id,
      ${deposits.amountCents} as amount_cents,
      ${deposits.promoCode} as promo_code,
      ${deposits.status} as status
    from ${deposits}
    where ${deposits.id} = ${depositId}
    for update
  `);

  const row = locked.rows[0] as
    | {
        id: string;
        user_id: string;
        amount_cents: number;
        promo_code: string | null;
        status: "pending" | "approved" | "rejected";
      }
    | undefined;

  if (!row) {
    throw new Error("deposit_not_found");
  }

  if (row.status !== "pending") {
    throw new Error("deposit_already_processed");
  }

  await tx.insert(walletLedger).values({
    userId: row.user_id,
    entryType: "deposit",
    amountCents: row.amount_cents,
    status: "posted",
    idempotencyKey: `deposit-approval:${row.id}`,
    metadata: {
      source: "deposit_approval",
      depositId: row.id,
    },
  });

  const promo = await claimAndApplyPromo(tx, {
    id: row.id,
    userId: row.user_id,
    amountCents: row.amount_cents,
    promoCode: row.promo_code,
  });

  const [updatedDeposit] = await tx
    .update(deposits)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy: adminId,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, row.id))
    .returning();

  return {
    deposit: updatedDeposit,
    promo,
  };
}

export async function approvePendingDeposit(
  depositId: string,
  adminId: string,
) {
  return db.transaction(async (tx) => {
    return approvePendingDepositInTx(tx, depositId, adminId);
  });
}
