import { Router } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../db/client.js";
import {
  rooms,
  users,
  walletLedger,
  deposits,
  payments,
  withdrawals,
} from "../db/schema.js";
import { requireAuth } from "./authMiddleware.js";
import { requireAgent } from "./agentGuard.js";
import { asyncHandler } from "./asyncHandler.js";
import { listAvailableRooms } from "../game/gameService.js";
import { amountToCents } from "../wallet/depositService.js";

const router = Router();

type PaymentListQuery = {
  page?: string;
  pageSize?: string;
  status?: string;
  source?: string;
  search?: string;
  minAmount?: string;
  maxAmount?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
};

function buildPaymentFilters(agentId: string, query: PaymentListQuery) {
  const filters = [eq(payments.agentId, agentId)] as any[];

  if (query.status && query.status !== "all") {
    filters.push(eq(payments.status, query.status as any));
  }

  if (query.source && query.source !== "all") {
    filters.push(ilike(payments.source, query.source));
  }

  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    filters.push(
      or(
        ilike(payments.transactionNumber, term),
        ilike(payments.phonenumber, term),
        ilike(payments.smsContent, term),
        ilike(payments.source, term),
      ),
    );
  }

  if (query.minAmount !== undefined && query.minAmount !== "") {
    const minAmount = Number(query.minAmount);
    if (Number.isFinite(minAmount)) {
      filters.push(gte(payments.amount, minAmount));
    }
  }

  if (query.maxAmount !== undefined && query.maxAmount !== "") {
    const maxAmount = Number(query.maxAmount);
    if (Number.isFinite(maxAmount)) {
      filters.push(lte(payments.amount, maxAmount));
    }
  }

  if (query.startDate) {
    const parsed = new Date(query.startDate);
    if (!Number.isNaN(parsed.getTime())) {
      filters.push(gte(payments.datetime, parsed));
    }
  }

  if (query.endDate) {
    const parsed = new Date(query.endDate);
    if (!Number.isNaN(parsed.getTime())) {
      filters.push(lte(payments.datetime, parsed));
    }
  }

  return filters;
}

// Apply middleware to all agent routes
router.use("/agent", requireAuth, requireAgent);

// ── ROOMS ────────────────────────────────────────────────────────────

// Get all rooms managed by the agent
router.get(
  "/agent/rooms",
  asyncHandler(async (req, res) => {
    const allRooms = await listAvailableRooms(req.identity!);

    res.json({
      rooms: allRooms.map((r) => ({
        ...r,
        price: (r.boardPriceCents / 100).toFixed(2),
      })),
    });
  }),
);

// Create a new room
router.post(
  "/agent/rooms",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { name, price, description, minPlayers, maxPlayers, color, icon } =
      req.body;

    const [room] = await db
      .insert(rooms)
      .values({
        agentId,
        name,
        boardPriceCents: amountToCents(Number(price)),
        description,
        minPlayers: minPlayers || 2,
        maxPlayers: maxPlayers || 10,
        color: color || "from-blue-500 to-blue-700",
        icon,
      })
      .returning();

    res.status(201).json({
      room: { ...room, price: (room.boardPriceCents / 100).toFixed(2) },
    });
  }),
);

// Update a room
router.put(
  "/agent/rooms/:id",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const roomId = req.params.id as string;
    const { name, price, description, minPlayers, maxPlayers, color, icon } =
      req.body;

    const [updated] = await db
      .update(rooms)
      .set({
        name,
        boardPriceCents:
          price !== undefined ? amountToCents(Number(price)) : undefined,
        description,
        minPlayers,
        maxPlayers,
        color,
        icon,
        updatedAt: new Date(),
      })
      .where(and(eq(rooms.id, roomId), eq(rooms.agentId, agentId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "room_not_found" });
      return;
    }

    res.json({
      room: { ...updated, price: (updated.boardPriceCents / 100).toFixed(2) },
    });
  }),
);

// Toggle bot allowed
router.patch(
  "/agent/rooms/:id/bot-allowed",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const roomId = req.params.id as string;
    const { botAllowed } = req.body;

    const [updated] = await db
      .update(rooms)
      .set({ botAllowed, updatedAt: new Date() })
      .where(and(eq(rooms.id, roomId), eq(rooms.agentId, agentId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "room_not_found" });
      return;
    }

    res.json({ room: updated });
  }),
);

// Delete a room
router.delete(
  "/agent/rooms/:id",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const roomId = req.params.id as string;

    const [deleted] = await db
      .delete(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.agentId, agentId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "room_not_found" });
      return;
    }

    res.json({ success: true });
  }),
);

// ── USERS ────────────────────────────────────────────────────────────

// Get users referred by the agent
router.get(
  "/agent/users",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { search, limit = "10", page = "1" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = eq(users.referredByAgentId, agentId);
    if (search) {
      const searchStr = `%${search}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(users.username, searchStr),
          ilike(users.firstName, searchStr),
          ilike(users.lastName, searchStr),
          ilike(users.email, searchStr),
        ),
      ) as any;
    }

    const [totalRes] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    // Fetch users and calculate balance from walletLedger
    const agentUsers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
        role: users.role,
      })
      .from(users)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(users.createdAt));

    // For each user, fetch balance from walletLedger
    const userIds = agentUsers.map((u) => u.id);
    let balances: Record<string, number> = {};
    if (userIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const balanceRows = await db
        .select({
          userId: walletLedger.userId,
          balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
        })
        .from(walletLedger)
        .where(inArray(walletLedger.userId, userIds))
        .groupBy(walletLedger.userId);
      for (const row of balanceRows) {
        balances[row.userId] = row.balanceCents;
      }
    }

    res.json({
      users: agentUsers.map((u) => ({
        ...u,
        balance: ((balances[u.id] ?? 0) / 100).toFixed(2),
      })),
      total: totalRes.count,
    });
  }),
);

// Get user detail
router.get(
  "/agent/users/:id",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const userId = req.params.id as string;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
        role: users.role,
        balanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.referredByAgentId, agentId)));

    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    // Get recent transactions for this user
    const userTransactions = await db
      .select({
        id: walletLedger.id,
        type: walletLedger.entryType,
        amountCents: walletLedger.amountCents,
        createdAt: walletLedger.createdAt,
        status: walletLedger.status,
      })
      .from(walletLedger)
      .where(eq(walletLedger.userId, userId))
      .limit(10)
      .orderBy(desc(walletLedger.createdAt));

    // Get invitees - currently only agents can have referrals, and we are viewing a user
    // So invitees will be empty unless this user is also an agent.
    // If we want to support user-to-user referrals later, we need to update the schema.
    const invitees: any[] = [];

    res.json({
      ...user,
      balance: (user.balanceCents / 100).toFixed(2),
      transactions: userTransactions.map((tx) => ({
        ...tx,
        amount: (tx.amountCents / 100).toFixed(2),
      })),
      invitees,
    });
  }),
);

// Update user role
router.patch(
  "/agent/users/:id/role",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const userId = req.params.id as string;
    const { role } = req.body;

    // Agent can only update role of their referred users
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.referredByAgentId, agentId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "user_not_found_or_not_authorized" });
      return;
    }

    res.json({ user: updated });
  }),
);

// ── PAYMENTS (DEPOSITS) ──────────────────────────────────────────────

// Get submitted payment records for this agent
router.get(
  "/agent/payments",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const query = req.query as PaymentListQuery;
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const filters = buildPaymentFilters(agentId, query);
    const whereClause = and(...filters);

    const sortBy = query.sortBy === "amount" ? "amount" : "date";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
    const orderByClause =
      sortBy === "amount"
        ? sortOrder === "asc"
          ? asc(payments.amount)
          : desc(payments.amount)
        : sortOrder === "asc"
          ? asc(payments.datetime)
          : desc(payments.datetime);

    const [rows, [{ count: total }]] = await Promise.all([
      db
        .select({
          id: payments.id,
          userId: payments.userId,
          username: users.username,
          firstName: users.firstName,
          amount: payments.amount,
          status: payments.status,
          createdAt: payments.createdAt,
          transaction_number: payments.transactionNumber,
          phonenumber: payments.phonenumber,
          source: payments.source,
          datetime: payments.datetime,
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause),
    ]);

    res.json({
      success: true,
      payments: rows.map((row) => ({
        ...row,
        username: row.username ?? null,
        firstName: row.firstName ?? null,
        amount: String(row.amount),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      sort: { sortBy, sortOrder },
    });
  }),
);

// Get payment stats
router.get(
  "/agent/payments/stats",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const query = req.query as PaymentListQuery;
    const filters = buildPaymentFilters(agentId, query);
    const whereClause = and(...filters);

    const [stats] = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        pendingCount: sql<number>`sum(case when ${payments.status} = 'pending' then 1 else 0 end)::int`,
        approvedCount: sql<number>`sum(case when ${payments.status} = 'approved' then 1 else 0 end)::int`,
        rejectedCount: sql<number>`sum(case when ${payments.status} = 'rejected' then 1 else 0 end)::int`,
        totalAmount: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
      })
      .from(payments)
      .where(whereClause);

    res.json({
      success: true,
      stats,
    });
  }),
);

// Submit Telebirr Payment
router.post(
  "/agent/payments/submit-telebirr",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { sms_content } = req.body;

    if (!sms_content || typeof sms_content !== "string") {
      res.status(400).json({ error: "Missing or invalid sms_content" });
      return;
    }

    try {
      if (/airtime/i.test(sms_content)) {
        res.status(400).json({
          error: "Transaction involves airtime, which is not supported",
        });
        return;
      }

      const sourceMatch = sms_content.match(/^From:\s*(\d+)/m);
      const source = sourceMatch ? sourceMatch[1] : "Telebirr";

      const amountMatch = sms_content.match(/received ETB\s+([\d,.]+)/i);
      const amount = amountMatch
        ? Math.round(parseFloat(amountMatch[1].replace(/,/g, "")))
        : null;

      let phonenumber: string | null = null;
      const numericPhoneMatch = sms_content.match(/from\s+(\d{9,15})/i);
      if (numericPhoneMatch) {
        phonenumber = numericPhoneMatch[1];
      }

      const maskedMatch = sms_content.match(
        /from\s+([^\(]+)\((\d{4}\*+\d{2,4})\)/i,
      );
      if (maskedMatch) {
        phonenumber = maskedMatch[2];
      }

      const datetimeMatch = sms_content.match(
        /on\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
      );

      let datetime: Date | null = null;
      if (datetimeMatch) {
        const [, day, month, year, hour, minute, second] = datetimeMatch;
        datetime = new Date(
          Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second),
          ),
        );
      }

      const txnMatch = sms_content.match(
        /transaction number is\s+([A-Z0-9]+)/i,
      );
      const transactionNumber = txnMatch ? txnMatch[1] : null;

      if (!amount || !phonenumber || !datetime || !transactionNumber) {
        res.status(400).json({
          error: "Could not extract all required fields from SMS",
          debug: {
            source,
            amount,
            phonenumber,
            datetime,
            transaction_number: transactionNumber,
          },
        });
        return;
      }

      const [payment] = await db
        .insert(payments)
        .values({
          agentId,
          source,
          amount,
          phonenumber,
          datetime,
          transactionNumber,
          smsContent: sms_content,
          status: "pending",
        })
        .returning();

      res.status(201).json({
        success: true,
        payment,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const duplicate =
        message.includes("uq_payments_transaction_number") ||
        message.includes("duplicate key");

      res.status(duplicate ? 409 : 500).json({
        error: duplicate
          ? "Payment with this transaction number already exists"
          : "Failed to parse SMS content",
        details: duplicate ? undefined : message,
      });
    }
  }),
);

// Submit CBE Payment
router.post(
  "/agent/payments/submit-cbe",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { sms_content } = req.body;

    if (!sms_content || typeof sms_content !== "string") {
      res.status(400).json({ error: "Missing or invalid sms_content" });
      return;
    }

    try {
      const source = "CBE";

      const amountMatch = sms_content.match(/Credited with ETB\s+([\d,.]+)/i);
      const amount = amountMatch
        ? Math.round(parseFloat(amountMatch[1].replace(/,/g, "")))
        : null;

      let senderName = "Unknown";
      const nameMatch = sms_content.match(/from\s+([^,]+),/i);
      if (nameMatch) {
        senderName = nameMatch[1].trim();
      }

      const phonenumber = senderName;

      const datetimeMatch = sms_content.match(
        /on\s+(\d{2})\/(\d{2})\/(\d{4})\s+at\s+(\d{2}):(\d{2}):(\d{2})/i,
      );

      let datetime: Date | null = null;
      if (datetimeMatch) {
        const [, day, month, year, hour, minute, second] = datetimeMatch;
        datetime = new Date(
          Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour) - 3,
            parseInt(minute),
            parseInt(second),
          ),
        );
      }

      const txnMatch = sms_content.match(/Ref No\s+([A-Z0-9]+)/i);
      const transactionNumber = txnMatch ? txnMatch[1] : null;

      if (!amount || !phonenumber || !datetime || !transactionNumber) {
        res.status(400).json({
          error: "Could not extract all required fields from CBE SMS",
          debug: {
            source,
            amount,
            phonenumber,
            datetime,
            transaction_number: transactionNumber,
          },
        });
        return;
      }

      const [payment] = await db
        .insert(payments)
        .values({
          agentId,
          source,
          amount,
          phonenumber,
          datetime,
          transactionNumber,
          smsContent: sms_content,
          status: "pending",
        })
        .returning();

      res.status(201).json({
        success: true,
        payment,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const duplicate =
        message.includes("uq_payments_transaction_number") ||
        message.includes("duplicate key");

      res.status(duplicate ? 409 : 500).json({
        error: duplicate
          ? "Payment with this transaction number already exists"
          : "Failed to parse CBE SMS content",
        details: duplicate ? undefined : message,
      });
    }
  }),
);

// ── WITHDRAWALS ──────────────────────────────────────────────────────

// Get withdrawals for referred users
router.get(
  "/agent/withdrawals",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { status, limit = "10", page = "1" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = and(
      eq(users.referredByAgentId, agentId),
      status && status !== "all"
        ? eq(withdrawals.status, status as any)
        : undefined,
    );

    const [totalRes] = await db
      .select({ count: count() })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause);

    const agentWithdrawals = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        username: users.username,
        firstName: users.firstName,
        amountCents: withdrawals.amountCents,
        phone: withdrawals.phone,
        status: withdrawals.status,
        rejectionReason: withdrawals.rejectionReason,
        createdAt: withdrawals.createdAt,
        userBalanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(withdrawals.createdAt));

    res.json({
      withdrawals: agentWithdrawals.map((w) => ({
        ...w,
        amount: (w.amountCents / 100).toFixed(2),
        userBalance: (w.userBalanceCents / 100).toFixed(2),
      })),
      total: totalRes.count,
    });
  }),
);

// Approve withdrawal
router.post(
  "/agent/withdrawals/:id/approve",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const withdrawalId = req.params.id as string;

    try {
      await db.transaction(async (tx) => {
        const [withdrawal] = await tx
          .select()
          .from(withdrawals)
          .innerJoin(users, eq(withdrawals.userId, users.id))
          .where(
            and(
              eq(withdrawals.id, withdrawalId),
              eq(users.referredByAgentId, agentId),
            ),
          )
          .for("update");

        if (!withdrawal) {
          throw new Error("withdrawal_not_found");
        }

        if (withdrawal.withdrawals.status !== "pending") {
          throw new Error("withdrawal_already_processed");
        }

        // Check current balance one more time
        const [summary] = await tx
          .select({
            balanceCents: sql<number>`coalesce(sum(case when ${walletLedger.status} = 'posted' then ${walletLedger.amountCents} else 0 end), 0)`,
          })
          .from(walletLedger)
          .where(eq(walletLedger.userId, withdrawal.withdrawals.userId));

        if ((summary?.balanceCents ?? 0) < withdrawal.withdrawals.amountCents) {
          throw new Error("insufficient_funds");
        }

        // 1. Update withdrawal status
        await tx
          .update(withdrawals)
          .set({
            status: "approved",
            approvedAt: new Date(),
            approvedBy: agentId,
            updatedAt: new Date(),
          })
          .where(eq(withdrawals.id, withdrawalId));

        // 2. Insert ledger entry
        await tx.insert(walletLedger).values({
          userId: withdrawal.withdrawals.userId,
          agentId: agentId,
          entryType: "withdrawal",
          amountCents: -withdrawal.withdrawals.amountCents,
          status: "posted",
          idempotencyKey: `withdrawal_approval_${withdrawalId}`,
          metadata: { phone: withdrawal.withdrawals.phone },
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }),
);

// Reject withdrawal
router.post(
  "/agent/withdrawals/:id/reject",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const withdrawalId = req.params.id as string;
    const { reason } = req.body;

    const [updated] = await db
      .update(withdrawals)
      .set({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "withdrawal_not_found" });
      return;
    }

    res.json({ success: true });
  }),
);

// ── TRANSACTIONS ─────────────────────────────────────────────────────

// Get transactions for referred users + agent commissions
router.get(
  "/agent/transactions",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { limit = "10", page = "1" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = or(
      eq(users.referredByAgentId, agentId),
      eq(walletLedger.agentId, agentId),
    );

    const [totalRes] = await db
      .select({ count: count() })
      .from(walletLedger)
      .leftJoin(users, eq(walletLedger.userId, users.id))
      .where(whereClause);

    const agentTransactions = await db
      .select({
        id: walletLedger.id,
        userId: walletLedger.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        entryType: walletLedger.entryType,
        amountCents: walletLedger.amountCents,
        status: walletLedger.status,
        createdAt: walletLedger.createdAt,
        metadata: walletLedger.metadata,
      })
      .from(walletLedger)
      .leftJoin(users, eq(walletLedger.userId, users.id))
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(walletLedger.createdAt));

    res.json({
      transactions: agentTransactions.map((t) => ({
        ...t,
        user: {
          id: t.userId,
          username: t.username,
          firstName: t.firstName,
          lastName: t.lastName,
        },
        amount: (t.amountCents / 100).toFixed(2),
        type: t.entryType,
        details:
          (t.metadata as any)?.comment || (t.metadata as any)?.reason || "",
      })),
      total: totalRes.count,
    });
  }),
);

// Get transaction stats
router.get(
  "/agent/transactions/stats",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;

    const [stats] = await db
      .select({
        totalWinCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'session_win' then ${walletLedger.amountCents} else 0 end), 0)`,
        totalLoseCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'board_purchase' then abs(${walletLedger.amountCents}) else 0 end), 0)`,
        totalCommissionCents: sql<number>`coalesce(sum(case when ${walletLedger.entryType} = 'commission' then ${walletLedger.amountCents} else 0 end), 0)`,
      })
      .from(walletLedger)
      .where(
        or(
          eq(users.referredByAgentId, agentId),
          eq(walletLedger.agentId, agentId),
        ),
      )
      .leftJoin(users, eq(walletLedger.userId, users.id));

    res.json({
      totalWins: (stats.totalWinCents / 100).toFixed(2),
      totalLosses: (stats.totalLoseCents / 100).toFixed(2),
      totalCommissions: (stats.totalCommissionCents / 100).toFixed(2),
    });
  }),
);

// Delete a transaction
router.delete(
  "/agent/transactions/:id",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const transactionId = req.params.id;

    // We only allow deleting transactions of referred users or transactions where agent is directly involved
    const [deleted] = await db
      .delete(walletLedger)
      .where(
        and(
          eq(walletLedger.id, transactionId as string),
          or(
            eq(walletLedger.agentId, agentId),
            sql`${walletLedger.userId} in (select id from ${users} where referred_by_agent_id = ${agentId})`,
          ),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "transaction_not_found" });
      return;
    }

    res.json({ success: true });
  }),
);

export default router;
