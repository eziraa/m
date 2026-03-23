import { Router } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/client.js";
import {
  adminSettings,
  broadcastDeleteJobs,
  broadcastPosts,
  deposits,
  postCategories,
  postDeliveries,
  rooms,
  users,
  walletLedger,
  withdrawals,
} from "../db/schema.js";
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

const adminBonusSchema = z
  .object({
    amount: z.number().min(0).optional(),
    description: z.string().max(500).optional(),
    message: z.string().max(2_000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const grantBonusSchema = z
  .object({
    target: z.enum(["all", "user", "users"]).default("user"),
    userId: z.string().uuid().optional(),
    userIds: z.array(z.string().uuid()).optional(),
    amount: z.number().min(0).optional(),
    message: z.string().max(2_000).optional(),
  })
  .strict();

const gameConfigSchema = z
  .object({
    value: z.union([z.string(), z.number()]),
  })
  .strict();

type AdminBonusSetting = {
  slug: "welcome_bonus" | "bonus";
  amount: number;
  description: string;
  message: string;
  isActive: boolean;
};

type GameConfigSetting = {
  key: string;
  label: string;
  value: string;
  description: string;
};

const postButtonSchema = z.object({
  text: z.string().trim().min(1).max(80),
  url: z.string().trim().url().optional().or(z.literal("")),
});

const postPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1),
    format: z.enum(["markdown", "html"]).default("markdown"),
    target: z.enum(["users", "channel"]).default("users"),
    categoryId: z.string().uuid().nullable().optional(),
    images: z.array(z.string().trim().url()).max(10).optional().default([]),
    buttons: z.array(z.array(postButtonSchema).max(8)).max(8).optional().default([]),
    scheduledAt: z.string().datetime().nullable().optional(),
  })
  .strict();

const postPatchSchema = postPayloadSchema.partial();

const deleteBroadcastSchema = z
  .object({
    mode: z.enum(["selected", "all", "date_range"]),
    userIds: z.array(z.string().uuid()).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

function parsePositiveInt(
  value: unknown,
  fallback: number,
  max: number = Number.MAX_SAFE_INTEGER,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function centsToDisplayAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

function mapLedgerEntryType(
  entryType: string,
  metadata: Record<string, unknown>,
): string {
  if (entryType === "deposit") return "deposit";
  if (entryType === "withdrawal") return "withdrawal";
  if (entryType === "session_win") return "game_win";
  if (entryType === "board_purchase") return "game_lost";
  if (entryType === "commission") return "referral_commission";
  if (entryType === "referral_reward") return "referral_reward";
  if (entryType === "adjustment") {
    const reason = String(metadata.reason ?? "");
    if (reason === "welcome_bonus") return "welcome_bonus";
    return "bonus";
  }
  return entryType;
}

function mapLedgerStatus(status: string) {
  return status === "posted" ? "completed" : "failed";
}

function buildUserSearch(search: string) {
  const value = `%${search}%`;
  return or(
    ilike(users.username, value),
    ilike(users.firstName, value),
    ilike(users.lastName, value),
    ilike(users.email, value),
  );
}

function mapSettingValue<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return { ...fallback, ...(value as Record<string, unknown>) } as T;
}

async function getBonusSetting(slug: AdminBonusSetting["slug"]) {
  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, `bonus:${slug}`))
    .limit(1);

  const fallback: AdminBonusSetting =
    slug === "welcome_bonus"
      ? {
          slug,
          amount: 25,
          description: "Starter credit granted to a newly created account.",
          message:
            "Welcome {{name}}! You received {{amount}} ETB to get started.",
          isActive: true,
        }
      : {
          slug,
          amount: 10,
          description: "Manual promotional credit that admins can grant.",
          message: "You received a bonus of {{amount}} ETB.",
          isActive: true,
        };

  return row ? mapSettingValue<AdminBonusSetting>(row.value, fallback) : fallback;
}

async function listBonusSettings() {
  const settings = await Promise.all([
    getBonusSetting("welcome_bonus"),
    getBonusSetting("bonus"),
  ]);
  return settings;
}

async function getGameConfigSetting(key: string) {
  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, `game_config:${key}`))
    .limit(1);

  const fallbackMap: Record<string, GameConfigSetting> = {
    countdownSeconds: {
      key: "countdownSeconds",
      label: "Countdown Seconds",
      value: "45",
      description: "How long a room waits before drawing starts.",
    },
    callIntervalMs: {
      key: "callIntervalMs",
      label: "Call Interval (ms)",
      value: "3000",
      description: "Delay between called numbers during an active session.",
    },
    totalNumbers: {
      key: "totalNumbers",
      label: "Total Numbers",
      value: "75",
      description: "How many draw numbers are available in a session.",
    },
  };

  const fallback = fallbackMap[key];
  if (!fallback) return null;
  return row ? mapSettingValue<GameConfigSetting>(row.value, fallback) : fallback;
}

async function listGameConfigSettings() {
  const settings = await Promise.all([
    getGameConfigSetting("countdownSeconds"),
    getGameConfigSetting("callIntervalMs"),
    getGameConfigSetting("totalNumbers"),
  ]);
  return settings.filter(Boolean) as GameConfigSetting[];
}

function normalizePostStatus(scheduledAt?: string | null, sentAt?: string | null) {
  if (sentAt) return "sent" as const;
  if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
    return "scheduled" as const;
  }
  return "draft" as const;
}

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get(
  "/admin/users",
  asyncHandler(async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(
      req.query.pageSize ?? req.query.limit,
      20,
      100,
    );
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search ?? "").trim();
    const role = String(req.query.role ?? "all").trim().toUpperCase();
    const sortBy = String(req.query.sortBy ?? "createdAt");
    const sortOrder = String(req.query.sortOrder ?? "desc").toLowerCase();

    const filters = [];
    if (search) {
      filters.push(buildUserSearch(search));
    }
    if (role !== "ALL") {
      filters.push(eq(users.role, role as "ADMIN" | "AGENT" | "USER"));
    }
    const whereClause = filters.length ? and(...filters) : undefined;
    const orderColumn =
      sortBy === "username"
        ? users.username
        : sortBy === "firstName"
          ? users.firstName
          : users.createdAt;
    const orderBy = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        balanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(users)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(orderBy);

    res.status(200).json({
      ok: true,
      page,
      pageSize,
      total: totalResult.count,
      users: rows.map((row) => ({
        ...row,
        balance: centsToDisplayAmount(row.balanceCents ?? 0),
      })),
    });
  }),
);

router.get(
  "/admin/users/:id",
  asyncHandler(async (req, res) => {
    const userId = String(req.params.id);

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        balanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const transactions = await db
      .select({
        id: walletLedger.id,
        entryType: walletLedger.entryType,
        amountCents: walletLedger.amountCents,
        status: walletLedger.status,
        createdAt: walletLedger.createdAt,
        metadata: walletLedger.metadata,
      })
      .from(walletLedger)
      .where(eq(walletLedger.userId, userId))
      .limit(20)
      .orderBy(desc(walletLedger.createdAt));

    const invitees = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.referredByAgentId, userId))
      .orderBy(desc(users.createdAt))
      .limit(20);

    res.status(200).json({
      ...user,
      balance: centsToDisplayAmount(user.balanceCents ?? 0),
      invitees,
      transactions: transactions.map((tx) => {
        const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
        return {
          id: tx.id,
          type: mapLedgerEntryType(tx.entryType, metadata),
          amount: centsToDisplayAmount(tx.amountCents),
          status: mapLedgerStatus(tx.status),
          createdAt: tx.createdAt,
          details:
            String(
              metadata.comment ??
                metadata.reason ??
                metadata.phone ??
                metadata.promoCode ??
                "",
            ) || null,
        };
      }),
    });
  }),
);

router.patch(
  "/admin/users/:id/role",
  asyncHandler(async (req, res) => {
    const role = z.enum(["USER", "AGENT", "ADMIN"]).safeParse(req.body?.role);
    if (!role.success) {
      res.status(400).json({ error: "invalid_role" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ role: role.data, updatedAt: new Date() })
      .where(eq(users.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    res.status(200).json({ ok: true, user: updated });
  }),
);

router.delete(
  "/admin/users/:id",
  asyncHandler(async (req, res) => {
    if (req.identity?.userId === req.params.id) {
      res.status(400).json({ error: "cannot_delete_current_admin" });
      return;
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, String(req.params.id)))
      .returning({ id: users.id });

    if (!deleted) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    res.status(200).json({ ok: true, success: true });
  }),
);

router.get(
  "/admin/withdrawals",
  asyncHandler(async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(
      req.query.pageSize ?? req.query.limit,
      20,
      100,
    );
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "all").trim().toLowerCase();

    const filters = [];
    if (status && status !== "all") {
      filters.push(
        eq(withdrawals.status, status as "pending" | "approved" | "rejected"),
      );
    }
    if (search) {
      const value = `%${search}%`;
      filters.push(
        or(
          ilike(users.username, value),
          ilike(users.firstName, value),
          ilike(users.lastName, value),
          ilike(users.email, value),
          ilike(withdrawals.phone, value),
        ),
      );
    }
    const whereClause = filters.length ? and(...filters) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause);

    const rows = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: withdrawals.phone,
        status: withdrawals.status,
        rejectionReason: withdrawals.rejectionReason,
        createdAt: withdrawals.createdAt,
        amountCents: withdrawals.amountCents,
        userBalanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(withdrawals.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      page,
      pageSize,
      withdrawals: rows.map((row) => ({
        ...row,
        amount: centsToDisplayAmount(row.amountCents),
        userBalance: centsToDisplayAmount(row.userBalanceCents ?? 0),
      })),
    });
  }),
);

router.post(
  "/admin/withdrawals/:id/approve",
  asyncHandler(async (req, res) => {
    const withdrawalId = String(req.params.id);
    const adminId = req.identity!.userId;

    try {
      await db.transaction(async (tx) => {
        const [withdrawal] = await tx
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.id, withdrawalId))
          .for("update");

        if (!withdrawal) {
          throw new Error("withdrawal_not_found");
        }

        if (withdrawal.status !== "pending") {
          throw new Error("withdrawal_already_processed");
        }

        const [summary] = await tx
          .select({
            balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
          })
          .from(walletLedger)
          .where(eq(walletLedger.userId, withdrawal.userId));

        if ((summary?.balanceCents ?? 0) < withdrawal.amountCents) {
          throw new Error("insufficient_funds");
        }

        await tx
          .update(withdrawals)
          .set({
            status: "approved",
            approvedAt: new Date(),
            approvedBy: adminId,
            updatedAt: new Date(),
          })
          .where(eq(withdrawals.id, withdrawalId));

        await tx.insert(walletLedger).values({
          userId: withdrawal.userId,
          agentId: adminId,
          entryType: "withdrawal",
          amountCents: -withdrawal.amountCents,
          status: "posted",
          idempotencyKey: `admin_withdrawal_approval:${withdrawalId}`,
          metadata: { phone: withdrawal.phone, source: "admin" },
        });
      });

      res.status(200).json({ ok: true, success: true });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "withdrawal_approve_failed";
      const status = reason.includes("not_found")
        ? 404
        : reason.includes("already_processed") || reason.includes("insufficient")
          ? 409
          : 500;
      res.status(status).json({ error: reason });
    }
  }),
);

router.post(
  "/admin/withdrawals/:id/reject",
  asyncHandler(async (req, res) => {
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

    const [updated] = await db
      .update(withdrawals)
      .set({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "withdrawal_not_found" });
      return;
    }

    res.status(200).json({ ok: true, success: true });
  }),
);

router.get(
  "/admin/transactions",
  asyncHandler(async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(
      req.query.pageSize ?? req.query.limit,
      20,
      100,
    );
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search ?? "").trim();
    const type = String(req.query.type ?? "all").trim().toLowerCase();
    const status = String(req.query.status ?? "all").trim().toLowerCase();

    const filters = [];
    if (search) {
      const value = `%${search}%`;
      filters.push(
        or(
          ilike(users.username, value),
          ilike(users.firstName, value),
          ilike(users.lastName, value),
          ilike(users.email, value),
          sql`cast(${walletLedger.id} as text) ilike ${value}`,
        ),
      );
    }
    if (status === "completed") {
      filters.push(eq(walletLedger.status, "posted"));
    } else if (status === "failed") {
      filters.push(eq(walletLedger.status, "reversed"));
    }
    if (type !== "all") {
      if (type === "game_win") {
        filters.push(eq(walletLedger.entryType, "session_win"));
      } else if (type === "game_lost") {
        filters.push(eq(walletLedger.entryType, "board_purchase"));
      } else if (type === "referral_commission") {
        filters.push(eq(walletLedger.entryType, "commission"));
      } else if (type === "referral_reward") {
        filters.push(eq(walletLedger.entryType, "referral_reward"));
      } else if (type === "welcome_bonus") {
        filters.push(eq(walletLedger.entryType, "adjustment"));
        filters.push(sql`${walletLedger.metadata}->>'reason' = 'welcome_bonus'`);
      } else if (type === "bonus") {
        filters.push(eq(walletLedger.entryType, "adjustment"));
      } else {
        filters.push(eq(walletLedger.entryType, type as never));
      }
    }
    const whereClause = filters.length ? and(...filters) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(walletLedger)
      .leftJoin(users, eq(walletLedger.userId, users.id))
      .where(whereClause);

    const rows = await db
      .select({
        id: walletLedger.id,
        userId: walletLedger.userId,
        entryType: walletLedger.entryType,
        amountCents: walletLedger.amountCents,
        status: walletLedger.status,
        createdAt: walletLedger.createdAt,
        metadata: walletLedger.metadata,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(walletLedger)
      .leftJoin(users, eq(walletLedger.userId, users.id))
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(walletLedger.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      page,
      pageSize,
      transactions: rows.map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          userId: row.userId,
          type: mapLedgerEntryType(row.entryType, metadata),
          amount: centsToDisplayAmount(row.amountCents),
          status: mapLedgerStatus(row.status),
          createdAt: row.createdAt,
          details:
            String(
              metadata.comment ??
                metadata.reason ??
                metadata.phone ??
                metadata.promoCode ??
                "",
            ) || null,
          user: row.userId
            ? {
                id: row.userId,
                username: row.username,
                firstName: row.firstName,
                lastName: row.lastName,
                name:
                  `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
                  row.username ||
                  null,
              }
            : null,
        };
      }),
    });
  }),
);

router.get(
  "/admin/transactions/stats",
  asyncHandler(async (_req, res) => {
    const [stats] = await db
      .select({
        totalDepositCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'deposit' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        totalWithdrawalCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'withdrawal' and ${walletLedger.status} = 'posted' then abs(${walletLedger.amountCents}) else 0 end), 0)`,
        totalCommissionCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'commission' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        totalRewardCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'session_win' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        totalReferralRewardCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'referral_reward' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        totalBonusCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'adjustment' and ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
      })
      .from(walletLedger);

    const totalDeposit = centsToAmount(stats.totalDepositCents ?? 0);
    const totalWithdrawal = centsToAmount(stats.totalWithdrawalCents ?? 0);
    const totalCommission = centsToAmount(stats.totalCommissionCents ?? 0);
    const totalReward = centsToAmount(stats.totalRewardCents ?? 0);
    const totalReferralReward = centsToAmount(
      stats.totalReferralRewardCents ?? 0,
    );
    const totalBonus = centsToAmount(stats.totalBonusCents ?? 0);

    res.status(200).json({
      ok: true,
      totalDeposit,
      totalWithdrawal,
      totalCommission,
      totalReward,
      totalReferralReward,
      totalBonus,
      netProfit: Number((totalDeposit - totalWithdrawal).toFixed(2)),
    });
  }),
);

router.delete(
  "/admin/transactions/:id",
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(walletLedger)
      .where(eq(walletLedger.id, String(req.params.id)))
      .returning({ id: walletLedger.id });

    if (!deleted) {
      res.status(404).json({ error: "transaction_not_found" });
      return;
    }

    res.status(200).json({ ok: true, success: true });
  }),
);

router.get(
  "/admin/bonuses",
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      ok: true,
      bonuses: await listBonusSettings(),
    });
  }),
);

router.patch(
  "/admin/bonuses/:slug",
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug) as AdminBonusSetting["slug"];
    const current =
      slug === "welcome_bonus" || slug === "bonus"
        ? await getBonusSetting(slug)
        : null;
    if (!current) {
      res.status(404).json({ error: "bonus_not_found" });
      return;
    }

    const parsed = adminBonusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const next = { ...current, ...parsed.data, slug };
    await db
      .insert(adminSettings)
      .values({
        key: `bonus:${slug}`,
        value: next,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: next, updatedAt: new Date() },
      });

    res.status(200).json({ ok: true, bonus: next });
  }),
);

router.post(
  "/admin/bonuses/grant",
  asyncHandler(async (req, res) => {
    const parsed = grantBonusSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const input = parsed.data;
    const configuredBonus = await getBonusSetting("bonus");
    const amount = input.amount ?? configuredBonus.amount;
    if (amount <= 0) {
      res.status(400).json({ error: "invalid_bonus_amount" });
      return;
    }

    let targetIds: string[] = [];
    if (input.target === "all") {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "USER"));
      targetIds = rows.map((row) => row.id);
    } else if (input.target === "users") {
      targetIds = input.userIds ?? [];
    } else if (input.userId) {
      targetIds = [input.userId];
    }

    targetIds = Array.from(new Set(targetIds));
    if (targetIds.length === 0) {
      res.status(400).json({ error: "no_target_users" });
      return;
    }

    const recipientRows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        username: users.username,
      })
      .from(users)
      .where(inArray(users.id, targetIds));

    const byId = new Map(recipientRows.map((row) => [row.id, row]));
    const grantedAt = new Date().toISOString();

    await db.insert(walletLedger).values(
      targetIds
        .filter((userId) => byId.has(userId))
        .map((userId) => ({
          userId,
          agentId: req.identity!.userId,
          entryType: "adjustment" as const,
          amountCents: amountToCents(amount),
          status: "posted" as const,
          idempotencyKey: `admin_bonus:${userId}:${grantedAt}`,
          metadata: {
            reason: "bonus",
            source: "admin_manual_grant",
            message: input.message ?? configuredBonus.message,
          },
        })),
    );

    res.status(200).json({
      ok: true,
      success: true,
      grantedCount: recipientRows.length,
      amount,
    });
  }),
);

router.get(
  "/admin/game-config",
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      ok: true,
      configs: await listGameConfigSettings(),
    });
  }),
);

router.patch(
  "/admin/game-config/:key",
  asyncHandler(async (req, res) => {
    const key = String(req.params.key);
    const current = await getGameConfigSetting(key);
    if (!current) {
      res.status(404).json({ error: "config_not_found" });
      return;
    }

    const parsed = gameConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const value = String(parsed.data.value).trim();
    if (!value) {
      res.status(400).json({ error: "config_value_required" });
      return;
    }

    const next = { ...current, value };
    await db
      .insert(adminSettings)
      .values({
        key: `game_config:${key}`,
        value: next,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: next, updatedAt: new Date() },
      });

    res.status(200).json({ ok: true, config: next });
  }),
);

router.get(
  "/admin/post-categories",
  asyncHandler(async (_req, res) => {
    const categories = await db
      .select()
      .from(postCategories)
      .where(eq(postCategories.isActive, true))
      .orderBy(asc(postCategories.name));

    res.status(200).json({
      ok: true,
      categories,
    });
  }),
);

router.get(
  "/admin/posts",
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? "").trim().toLowerCase();
    const search = String(req.query.search ?? "").trim();

    const filters = [];
    if (status) {
      filters.push(eq(broadcastPosts.status, status as any));
    }
    if (search) {
      const value = `%${search}%`;
      filters.push(
        or(
          ilike(broadcastPosts.title, value),
          ilike(broadcastPosts.content, value),
        ),
      );
    }

    const whereClause = filters.length ? and(...filters) : undefined;
    const rows = await db
      .select({
        id: broadcastPosts.id,
        title: broadcastPosts.title,
        content: broadcastPosts.content,
        format: broadcastPosts.format,
        target: broadcastPosts.target,
        categoryId: broadcastPosts.categoryId,
        images: broadcastPosts.images,
        buttons: broadcastPosts.buttons,
        status: broadcastPosts.status,
        scheduledAt: broadcastPosts.scheduledAt,
        sentAt: broadcastPosts.sentAt,
        createdAt: broadcastPosts.createdAt,
        updatedAt: broadcastPosts.updatedAt,
      })
      .from(broadcastPosts)
      .where(whereClause)
      .orderBy(desc(broadcastPosts.updatedAt));

    res.status(200).json({
      ok: true,
      posts: rows,
    });
  }),
);

router.get(
  "/admin/posts/scheduled",
  asyncHandler(async (_req, res) => {
    const posts = await db
      .select()
      .from(broadcastPosts)
      .where(eq(broadcastPosts.status, "scheduled"))
      .orderBy(asc(broadcastPosts.scheduledAt));

    res.status(200).json({ ok: true, posts });
  }),
);

router.post(
  "/admin/posts",
  asyncHandler(async (req, res) => {
    const parsed = postPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const status = normalizePostStatus(data.scheduledAt ?? null, null);

    const [created] = await db
      .insert(broadcastPosts)
      .values({
        title: data.title,
        content: data.content,
        format: data.format,
        target: data.target,
        categoryId: data.categoryId ?? null,
        images: data.images,
        buttons: data.buttons,
        scheduledAt,
        status,
        createdBy: req.identity!.userId,
        updatedBy: req.identity!.userId,
      })
      .returning();

    res.status(201).json({ ok: true, id: created.id, post: created });
  }),
);

router.get(
  "/admin/posts/:id",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const [post] = await db
      .select()
      .from(broadcastPosts)
      .where(eq(broadcastPosts.id, postId))
      .limit(1);

    if (!post) {
      res.status(404).json({ error: "post_not_found" });
      return;
    }

    const [analytics] = await db
      .select({
        totalRecipients: count(postDeliveries.id),
        sent: sql<number>`count(case when ${postDeliveries.status} = 'sent' then 1 end)`,
        failed: sql<number>`count(case when ${postDeliveries.status} = 'failed' then 1 end)`,
        pending: sql<number>`count(case when ${postDeliveries.status} = 'pending' then 1 end)`,
      })
      .from(postDeliveries)
      .where(eq(postDeliveries.postId, postId));

    const totalRecipients = analytics?.totalRecipients ?? 0;
    const sent = analytics?.sent ?? 0;
    const failed = analytics?.failed ?? 0;
    const pending = analytics?.pending ?? 0;

    res.status(200).json({
      ok: true,
      post,
      analytics: {
        total: totalRecipients,
        totalRecipients,
        sent,
        failed,
        pending,
        deliveryRate:
          totalRecipients > 0 ? Math.round((sent / totalRecipients) * 100) : 0,
      },
    });
  }),
);

router.patch(
  "/admin/posts/:id",
  asyncHandler(async (req, res) => {
    const parsed = postPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: req.identity!.userId,
    };
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.format !== undefined) patch.format = data.format;
    if (data.target !== undefined) patch.target = data.target;
    if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
    if (data.images !== undefined) patch.images = data.images;
    if (data.buttons !== undefined) patch.buttons = data.buttons;
    if (data.scheduledAt !== undefined) {
      patch.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
      patch.status = normalizePostStatus(data.scheduledAt ?? null, null);
    }

    const [updated] = await db
      .update(broadcastPosts)
      .set(patch)
      .where(eq(broadcastPosts.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "post_not_found" });
      return;
    }

    res.status(200).json({ ok: true, post: updated });
  }),
);

router.delete(
  "/admin/posts/:id",
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(broadcastPosts)
      .where(eq(broadcastPosts.id, String(req.params.id)))
      .returning({ id: broadcastPosts.id });

    if (!deleted) {
      res.status(404).json({ error: "post_not_found" });
      return;
    }

    res.status(200).json({ ok: true, success: true });
  }),
);

router.post(
  "/admin/posts/:id/send",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const [post] = await db
      .select()
      .from(broadcastPosts)
      .where(eq(broadcastPosts.id, postId))
      .limit(1);

    if (!post) {
      res.status(404).json({ error: "post_not_found" });
      return;
    }

    const sentAt = new Date();

    if (post.target === "channel") {
      const [category] = post.categoryId
        ? await db
            .select()
            .from(postCategories)
            .where(eq(postCategories.id, post.categoryId))
            .limit(1)
        : [];

      const chatId = category?.channelChatId || `channel:${category?.slug ?? "general"}`;

      await db
        .insert(postDeliveries)
        .values({
          postId,
          chatId,
          status: "sent",
          messageId: `channel-${Date.now()}`,
          deliveredAt: sentAt,
        })
        .onConflictDoUpdate({
          target: [postDeliveries.postId, postDeliveries.chatId],
          set: {
            status: "sent",
            messageId: `channel-${Date.now()}`,
            deliveredAt: sentAt,
            errorMessage: null,
            updatedAt: sentAt,
          },
        });
    } else {
      const recipients = await db
        .select({
          id: users.id,
          chatId: users.telegramId,
        })
        .from(users)
        .where(eq(users.isActive, true));

      for (const recipient of recipients) {
        const chatId = recipient.chatId || recipient.id;
        await db
          .insert(postDeliveries)
          .values({
            postId,
            userId: recipient.id,
            chatId,
            status: "sent",
            messageId: `msg-${postId}-${recipient.id}`,
            deliveredAt: sentAt,
          })
          .onConflictDoUpdate({
            target: [postDeliveries.postId, postDeliveries.chatId],
            set: {
              userId: recipient.id,
              status: "sent",
              messageId: `msg-${postId}-${recipient.id}`,
              deliveredAt: sentAt,
              errorMessage: null,
              updatedAt: sentAt,
            },
          });
      }
    }

    await db
      .update(broadcastPosts)
      .set({
        status: "sent",
        sentAt,
        updatedAt: sentAt,
        updatedBy: req.identity!.userId,
      })
      .where(eq(broadcastPosts.id, postId));

    res.status(200).json({
      ok: true,
      queued: false,
      messageId: `broadcast-${postId}`,
    });
  }),
);

router.get(
  "/admin/posts/:id/broadcast-status",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const [post] = await db
      .select({ status: broadcastPosts.status })
      .from(broadcastPosts)
      .where(eq(broadcastPosts.id, postId))
      .limit(1);

    const [progress] = await db
      .select({
        total: count(postDeliveries.id),
        sent: sql<number>`count(case when ${postDeliveries.status} = 'sent' then 1 end)`,
        failed: sql<number>`count(case when ${postDeliveries.status} = 'failed' then 1 end)`,
        pending: sql<number>`count(case when ${postDeliveries.status} = 'pending' then 1 end)`,
      })
      .from(postDeliveries)
      .where(eq(postDeliveries.postId, postId));

    res.status(200).json({
      ok: true,
      queueStatus:
        post?.status === "sending"
          ? "running"
          : post?.status === "failed"
            ? "done"
            : progress?.total
              ? "done"
              : "idle",
      progress: {
        total: progress?.total ?? 0,
        sent: progress?.sent ?? 0,
        failed: progress?.failed ?? 0,
        pending: progress?.pending ?? 0,
      },
    });
  }),
);

router.get(
  "/admin/posts/:id/deliveries",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(postDeliveries)
      .where(eq(postDeliveries.postId, postId));

    const deliveries = await db
      .select({
        id: postDeliveries.id,
        chatId: postDeliveries.chatId,
        status: postDeliveries.status,
        errorMessage: postDeliveries.errorMessage,
        createdAt: postDeliveries.createdAt,
        deliveredAt: postDeliveries.deliveredAt,
      })
      .from(postDeliveries)
      .where(eq(postDeliveries.postId, postId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(postDeliveries.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      deliveries,
    });
  }),
);

router.get(
  "/admin/posts/:id/recipients",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 50, 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? "").trim();
    const deletionStatus = String(req.query.deletionStatus ?? "").trim().toLowerCase();

    const filters = [eq(postDeliveries.postId, postId)];
    if (search) {
      const value = `%${search}%`;
      filters.push(
        or(
          ilike(users.username, value),
          ilike(users.firstName, value),
          ilike(postDeliveries.chatId, value),
        ) as any,
      );
    }
    if (deletionStatus) {
      filters.push(eq(postDeliveries.deletionStatus, deletionStatus as any));
    }
    const whereClause = and(...filters);

    const [totalResult] = await db
      .select({ count: count() })
      .from(postDeliveries)
      .leftJoin(users, eq(postDeliveries.userId, users.id))
      .where(whereClause);

    const recipients = await db
      .select({
        id: postDeliveries.id,
        userId: postDeliveries.userId,
        username: users.username,
        firstName: users.firstName,
        telegramId: users.telegramId,
        chatId: postDeliveries.chatId,
        deliveredAt: postDeliveries.deliveredAt,
        deletionStatus: postDeliveries.deletionStatus,
      })
      .from(postDeliveries)
      .leftJoin(users, eq(postDeliveries.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(postDeliveries.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      recipients,
    });
  }),
);

router.post(
  "/admin/posts/:id/delete-broadcast",
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id);
    const parsed = deleteBroadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.flatten() });
      return;
    }

    const input = parsed.data;
    const deliveryFilters = [eq(postDeliveries.postId, postId)];
    if (input.mode === "selected" && input.userIds?.length) {
      deliveryFilters.push(inArray(postDeliveries.userId, input.userIds));
    }
    const rows = await db
      .select({ id: postDeliveries.id })
      .from(postDeliveries)
      .where(and(...deliveryFilters));

    const jobId = crypto.randomUUID();
    const now = new Date();

    await db.insert(broadcastDeleteJobs).values({
      id: jobId,
      postId,
      requestedBy: req.identity!.userId,
      mode: input.mode,
      status: "running",
      filters: input,
      totalTargeted: rows.length,
      successCount: rows.length,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    if (rows.length > 0) {
      await db
        .update(postDeliveries)
        .set({
          deletionStatus: "deleted",
          deletedAt: now,
          updatedAt: now,
        })
        .where(inArray(postDeliveries.id, rows.map((row) => row.id)));
    }

    await db
      .update(broadcastDeleteJobs)
      .set({
        status: "done",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(broadcastDeleteJobs.id, jobId));

    res.status(200).json({ ok: true, jobId });
  }),
);

router.get(
  "/admin/posts/:id/delete-broadcast-status/:jobId",
  asyncHandler(async (req, res) => {
    const [job] = await db
      .select()
      .from(broadcastDeleteJobs)
      .where(eq(broadcastDeleteJobs.id, String(req.params.jobId)))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "job_not_found" });
      return;
    }

    res.status(200).json({
      ok: true,
      progress: {
        status: job.status,
        totalTargeted: job.totalTargeted,
        successCount: job.successCount,
        failedCount: job.failedCount,
      },
    });
  }),
);

router.post(
  "/admin/posts/:id/delete-broadcast-cancel/:jobId",
  asyncHandler(async (req, res) => {
    const [job] = await db
      .update(broadcastDeleteJobs)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(broadcastDeleteJobs.id, String(req.params.jobId)))
      .returning();

    if (!job) {
      res.status(404).json({ error: "job_not_found" });
      return;
    }

    res.status(200).json({ ok: true, success: true });
  }),
);

router.get(
  "/admin/delivery-log",
  asyncHandler(async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 30, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(postDeliveries);

    const deliveries = await db
      .select({
        id: postDeliveries.id,
        status: postDeliveries.status,
        chatId: postDeliveries.chatId,
        errorMessage: postDeliveries.errorMessage,
        createdAt: postDeliveries.createdAt,
        postTitle: broadcastPosts.title,
      })
      .from(postDeliveries)
      .leftJoin(broadcastPosts, eq(postDeliveries.postId, broadcastPosts.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(postDeliveries.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      deliveries,
    });
  }),
);

router.post(
  "/admin/promocodes",
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
  asyncHandler(async (req, res) => {
    try {
      const result = await approvePendingDeposit(
        String(req.params.id),
        req.identity!.userId,
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

router.get(
  "/admin/rooms",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(rooms).orderBy(desc(rooms.createdAt));

    res.status(200).json({
      ok: true,
      rooms: rows.map((room) => ({
        ...room,
        price: centsToDisplayAmount(room.boardPriceCents),
        isLive: false,
      })),
    });
  }),
);

router.get(
  "/admin/deposits",
  asyncHandler(async (req, res) => {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(
      req.query.pageSize ?? req.query.limit,
      20,
      100,
    );
    const offset = (page - 1) * pageSize;
    const status = String(req.query.status ?? "all").trim().toLowerCase();

    const whereClause =
      status && status !== "all"
        ? eq(deposits.status, status as "pending" | "approved" | "rejected")
        : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(deposits)
      .where(whereClause);

    const rows = await db
      .select()
      .from(deposits)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(deposits.createdAt));

    res.status(200).json({
      ok: true,
      total: totalResult.count,
      deposits: rows.map((row) => ({
        ...row,
        amount: centsToAmount(row.amountCents),
      })),
    });
  }),
);

export default router;
