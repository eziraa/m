import { Router } from "express";
import { and, desc, eq, sql, ilike, or, count, sum } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  rooms,
  users,
  walletLedger,
  deposits,
  withdrawals,
} from "../db/schema.js";
import { requireAuth } from "./authMiddleware.js";
import { requireAgent } from "./agentGuard.js";
import { asyncHandler } from "./asyncHandler.js";
import { amountToCents } from "../wallet/depositService.js";

const router = Router();

// Apply middleware to all agent routes
router.use(requireAuth);
router.use(requireAgent);

// ── ROOMS ────────────────────────────────────────────────────────────

// Get all rooms managed by the agent
router.get(
  "/agent/rooms",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const allRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.agentId, agentId))
      .orderBy(desc(rooms.createdAt));

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
        balanceCents: sql<number>`coalesce((select sum(case when status = 'posted' then amount_cents else 0 end) from ${walletLedger} where user_id = ${users.id}), 0)`,
      })
      .from(users)
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(users.createdAt));

    res.json({
      users: agentUsers.map((u) => ({
        ...u,
        balance: (u.balanceCents / 100).toFixed(2),
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

// Get deposits for referred users
router.get(
  "/agent/payments",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { status, limit = "10", page = "1" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = and(
      eq(users.referredByAgentId, agentId),
      status && status !== "all"
        ? eq(deposits.status, status as any)
        : undefined,
    );

    const [totalRes] = await db
      .select({ count: count() })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .where(whereClause);

    const agentPayments = await db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        username: users.username,
        firstName: users.firstName,
        amountCents: deposits.amountCents,
        status: deposits.status,
        createdAt: deposits.createdAt,
      })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(deposits.createdAt));

    res.json({
      payments: agentPayments.map((p) => ({
        ...p,
        amount: (p.amountCents / 100).toFixed(2),
      })),
      total: totalRes.count,
    });
  }),
);

// Get payment stats
router.get(
  "/agent/payments/stats",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;

    const [stats] = await db
      .select({
        totalAmountCents: sql<number>`coalesce(sum(case when ${deposits.status} = 'approved' then ${deposits.amountCents} else 0 end), 0)`,
        count: count(deposits.id),
        pendingCount: sql<number>`count(case when ${deposits.status} = 'pending' then 1 end)`,
      })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .where(eq(users.referredByAgentId, agentId));

    res.json({
      totalApproved: (stats.totalAmountCents / 100).toFixed(2),
      totalCount: stats.count,
      pendingCount: stats.pendingCount,
    });
  }),
);

// Submit Telebirr Payment
router.post(
  "/agent/payments/submit-telebirr",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { sms_content } = req.body;

    if (!sms_content) {
      res.status(400).json({ error: "sms_content_required" });
      return;
    }

    // Basic Telebirr Parsing
    // Example: "You have received 100.00 ETB from ... Transaction No: 6KH1234567 ..."
    const txMatch =
      sms_content.match(/Transaction No\s*[:]\s*([A-Za-z0-9]+)/i) ||
      sms_content.match(/Trans\.ID\s*[:]\s*([A-Za-z0-9]+)/i);
    const amountMatch =
      sms_content.match(/([0-9.,]+)\s*ETB/i) ||
      sms_content.match(/received\s*([0-9.,]+)/i);
    const phoneMatch = sms_content.match(/(09\d{8})/);

    if (!txMatch || !amountMatch) {
      res.status(400).json({ error: "failed_to_parse_sms" });
      return;
    }

    const transactionNumber = txMatch[1];
    const amountStr = amountMatch[1].replace(/,/g, "");
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    const phone = phoneMatch ? phoneMatch[1] : "unknown";

    // Find user by phone if possible (Telegram ID or username might be better, but phone is in SMS)
    // For now, we'll create a ledger entry if we can find a user by "something".
    // In this app, users might not have phone numbers in DB.
    // We might need to ask the agent to specify the user, but the UI only sends SMS content.

    // Let's assume we need to find the user. If we can't find by phone, we might have an issue.
    // However, the agent dashboard is for referred users.
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.referredByAgentId, agentId),
          or(eq(users.username, phone), eq(users.telegramId, phone)),
        ),
      ) // Mocking phone lookup
      .limit(1);

    // If no user found, we can't credit anyone.
    // But since the UI is generic, maybe we should at least log it?
    // The prompt says "prepare enpoints that can serve correct data".

    // For now, I'll implement the logic to insert into ledger if user is found.
    if (!user) {
      res.status(404).json({ error: "user_not_found_for_this_phone" });
      return;
    }

    await db.insert(walletLedger).values({
      userId: user.id,
      agentId: agentId,
      entryType: "deposit",
      amountCents: amountCents,
      status: "posted",
      idempotencyKey: `manual_telebirr_${transactionNumber}`,
      metadata: {
        source: "telebirr_manual",
        transactionNumber,
        sms_content,
        phone,
      },
    });

    res.json({ success: true, transactionNumber });
  }),
);

// Submit CBE Payment
router.post(
  "/agent/payments/submit-cbe",
  asyncHandler(async (req, res) => {
    const agentId = req.identity!.userId;
    const { sms_content } = req.body;

    if (!sms_content) {
      res.status(400).json({ error: "sms_content_required" });
      return;
    }

    // Basic CBE Parsing
    // Example: "Dear Ezira your Account ... has been Credited with 100.00 ETB ... Transaction No FT123456 ..."
    const txMatch =
      sms_content.match(/Transaction No\s*([A-Za-z0-9]+)/i) ||
      sms_content.match(/Ref\s*([A-Za-z0-9]+)/i);
    const amountMatch =
      sms_content.match(/Credited with\s*([0-9.,]+)\s*ETB/i) ||
      sms_content.match(/([0-9.,]+)\s*ETB/i);

    if (!txMatch || !amountMatch) {
      res.status(400).json({ error: "failed_to_parse_sms" });
      return;
    }

    const transactionNumber = txMatch[1];
    const amountStr = amountMatch[1].replace(/,/g, "");
    const amountCents = Math.round(parseFloat(amountStr) * 100);

    // Again, we need a way to link this to a user.
    // Usually, the SMS content for CBE doesn't have the *sender's* phone number, only the receiver's account.
    // This is a common problem with manual SMS submission.
    // For now, I'll return an error saying user lookup failed until I have a better way.

    res.status(400).json({
      error: "manual_cbe_requires_user_identification_logic_not_implemented",
    });
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
