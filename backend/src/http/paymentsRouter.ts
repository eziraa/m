import { and, eq, or, sql } from "drizzle-orm";
import { Router } from "express";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { deposits, payments, users } from "../db/schema.js";
import { asyncHandler } from "./asyncHandler.js";
import { requireAuth } from "./authMiddleware.js";
import { getBot } from "../telegram/bot.js";
import {
  approvePendingDepositInTx,
  normalizePromoCode,
} from "../wallet/depositService.js";

const router = Router();

type ParsedPendingPayment = {
  source: string;
  amount: number;
  phonenumber: string;
  datetime: Date;
  transactionNumber: string;
};

function extractTransactionNumber(smsContent: string): string | null {
  const patterns = [
    /receipt\/([A-Z0-9]{9,20})/i,
    /\?id=([A-Z0-9]{9,32})/i,
    /BranchReceipt\/([A-Z0-9]{9,32})/i,
    /transaction number is\s+([A-Z0-9]+)/i,
    /Transaction No\s*:?\s*([A-Z0-9]+)/i,
    /Trans\.?ID\s*:?\s*([A-Z0-9]+)/i,
    /Ref No\s+([A-Z0-9]+)/i,
    /Ref\s+([A-Z0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = smsContent.match(pattern);
    if (!match) {
      continue;
    }

    if (pattern.source.includes("\\?id=")) {
      const id = match[1];
      const strictMatch = id.match(/^(FT\d{6}[A-Z0-9]{4})/);
      return strictMatch ? strictMatch[1] : id;
    }

    return match[1];
  }

  return null;
}

function parseTelebirrPayment(smsContent: string): ParsedPendingPayment | null {
  if (/airtime/i.test(smsContent)) {
    throw new Error("airtime_not_supported");
  }

  const sourceMatch = smsContent.match(/^From:\s*(\d+)/m);
  const source = sourceMatch ? sourceMatch[1] : "Telebirr";

  const amountMatch = smsContent.match(/received ETB\s+([\d,.]+)/i);
  const amount = amountMatch
    ? Math.round(parseFloat(amountMatch[1].replace(/,/g, "")))
    : null;

  let phonenumber: string | null = null;
  const numericPhoneMatch = smsContent.match(/from\s+(\d{9,15})/i);
  if (numericPhoneMatch) {
    phonenumber = numericPhoneMatch[1];
  }

  const maskedMatch = smsContent.match(/from\s+([^\(]+)\((\d{4}\*+\d{2,4})\)/i);
  if (maskedMatch) {
    phonenumber = maskedMatch[2];
  }

  const datetimeMatch = smsContent.match(
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

  const txnMatch = smsContent.match(/transaction number is\s+([A-Z0-9]+)/i);
  const transactionNumber = txnMatch ? txnMatch[1] : null;

  if (!amount || !phonenumber || !datetime || !transactionNumber) {
    return null;
  }

  return {
    source,
    amount,
    phonenumber,
    datetime,
    transactionNumber,
  };
}

function parseCbePayment(smsContent: string): ParsedPendingPayment | null {
  const source = "CBE";
  const amountMatch = smsContent.match(/Credited with ETB\s+([\d,.]+)/i);
  const amount = amountMatch
    ? Math.round(parseFloat(amountMatch[1].replace(/,/g, "")))
    : null;

  let senderName = "Unknown";
  const nameMatch = smsContent.match(/from\s+([^,]+),/i);
  if (nameMatch) {
    senderName = nameMatch[1].trim();
  }

  const phonenumber = senderName;

  const datetimeMatch = smsContent.match(
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

  const txnMatch = smsContent.match(/Ref No\s+([A-Z0-9]+)/i);
  const transactionNumber = txnMatch ? txnMatch[1] : null;

  if (!amount || !phonenumber || !datetime || !transactionNumber) {
    return null;
  }

  return {
    source,
    amount,
    phonenumber,
    datetime,
    transactionNumber,
  };
}

async function sendTelegramNotification(
  telegramId: string | null | undefined,
  message: string,
) {
  if (!telegramId || !env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    const chatId = Number(telegramId);
    if (!Number.isFinite(chatId)) {
      return;
    }
    await getBot().telegram.sendMessage(chatId, message);
  } catch (error) {
    console.error("Telegram notification error:", error);
  }
}

async function findAgentByTelegramId(agentTelegramId: string) {
  const [agent] = await db
    .select({
      id: users.id,
      telegramId: users.telegramId,
    })
    .from(users)
    .where(and(eq(users.telegramId, agentTelegramId), eq(users.role, "AGENT")))
    .limit(1);

  return agent ?? null;
}

async function findAgentOrAdminByTelegramId(agentTelegramId: string) {
  const [agent] = await db
    .select({
      id: users.id,
      telegramId: users.telegramId,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.telegramId, agentTelegramId),
        or(eq(users.role, "AGENT"), eq(users.role, "ADMIN")),
      ),
    )
    .limit(1);

  return agent ?? null;
}

async function notifyPendingPayment(
  agentId: string,
  payment: ParsedPendingPayment,
) {
  const [agent] = await db
    .select({
      telegramId: users.telegramId,
      firstName: users.firstName,
    })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);

  await sendTelegramNotification(
    agent?.telegramId,
    [
      "New pending payment received.",
      `Source: ${payment.source}`,
      `Amount: ${payment.amount} ETB`,
      `Transaction ID: ${payment.transactionNumber}`,
      `Sender: ${payment.phonenumber}`,
      "It is now stored as pending and waiting for the user to approve it.",
    ].join("\n"),
  );
}

async function notifyApprovedDeposit(args: {
  userId: string;
  agentId: string;
  amount: string;
  transactionNumber: string;
}) {
  const [user] = await db
    .select({
      telegramId: users.telegramId,
      firstName: users.firstName,
    })
    .from(users)
    .where(eq(users.id, args.userId))
    .limit(1);

  const [agent] = await db
    .select({
      telegramId: users.telegramId,
      firstName: users.firstName,
    })
    .from(users)
    .where(eq(users.id, args.agentId))
    .limit(1);

  await Promise.all([
    sendTelegramNotification(
      user?.telegramId,
      [
        `Your deposit of ${args.amount} ETB has been approved successfully.`,
        `Transaction ID: ${args.transactionNumber}`,
        "Your balance has been updated.",
      ].join("\n"),
    ),
    sendTelegramNotification(
      agent?.telegramId,
      [
        `A user deposit has been approved successfully.`,
        `Amount: ${args.amount} ETB`,
        `Transaction ID: ${args.transactionNumber}`,
        "The user's balance has been credited.",
      ].join("\n"),
    ),
  ]);
}

async function createPendingPaymentRecord(args: {
  agentId: string;
  smsContent: string;
  parser: (smsContent: string) => ParsedPendingPayment | null;
}) {
  const parsed = args.parser(args.smsContent);
  if (!parsed) {
    throw new Error("parse_failed");
  }

  const [payment] = await db
    .insert(payments)
    .values({
      agentId: args.agentId,
      source: parsed.source,
      amount: parsed.amount,
      phonenumber: parsed.phonenumber,
      datetime: parsed.datetime,
      transactionNumber: parsed.transactionNumber,
      smsContent: args.smsContent,
      status: "pending",
    })
    .returning();

  await notifyPendingPayment(args.agentId, parsed);

  return payment;
}

const approvePaymentHandler = asyncHandler(async (req, res) => {
  if (!req.identity) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { sms_content, promoCode } = req.body ?? {};

  if (typeof sms_content !== "string" || sms_content.trim().length === 0) {
    res.status(400).json({ error: "sms_content_required" });
    return;
  }

  const transactionNumber = extractTransactionNumber(sms_content);
  if (!transactionNumber) {
    res.status(400).json({ error: "transaction_number_not_found" });
    return;
  }

  const normalizedPromoCode =
    typeof promoCode === "string" && promoCode.trim().length > 0
      ? normalizePromoCode(promoCode)
      : null;

  try {
    const result = await db.transaction(async (tx) => {
      const locked = await tx.execute(sql`
        select
          ${payments.id} as id,
          ${payments.userId} as user_id,
          ${payments.agentId} as agent_id,
          ${payments.amount} as amount,
          ${payments.status} as status,
          ${payments.transactionNumber} as transaction_number
        from ${payments}
        where ${payments.transactionNumber} = ${transactionNumber}
        for update
      `);

      const paymentRow = locked.rows[0] as
        | {
            id: string;
            user_id: string | null;
            agent_id: string;
            amount: number;
            status: "pending" | "approved" | "rejected";
            transaction_number: string;
          }
        | undefined;

      if (!paymentRow) {
        throw new Error("payment_not_found");
      }

      if (paymentRow.status === "approved") {
        if (paymentRow.user_id === req.identity!.userId) {
          throw new Error("payment_already_approved");
        }
        throw new Error("payment_claimed_by_other_user");
      }

      if (paymentRow.status === "rejected") {
        throw new Error("payment_rejected");
      }

      const amountCents = paymentRow.amount * 100;

      const [pendingDeposit] = await tx
        .select({
          id: deposits.id,
          promoCode: deposits.promoCode,
        })
        .from(deposits)
        .where(
          and(
            eq(deposits.userId, req.identity!.userId),
            eq(deposits.status, "pending"),
            eq(deposits.amountCents, amountCents),
          ),
        )
        .orderBy(sql`${deposits.createdAt} asc`)
        .limit(1);

      let depositId = pendingDeposit?.id;

      if (!depositId) {
        const [createdDeposit] = await tx
          .insert(deposits)
          .values({
            userId: req.identity!.userId,
            amountCents,
            promoCode: normalizedPromoCode,
            status: "pending",
          })
          .returning({ id: deposits.id });

        depositId = createdDeposit.id;
      } else if (!pendingDeposit.promoCode && normalizedPromoCode) {
        await tx
          .update(deposits)
          .set({
            promoCode: normalizedPromoCode,
            updatedAt: new Date(),
          })
          .where(eq(deposits.id, depositId));
      }

      await tx
        .update(payments)
        .set({
          userId: req.identity!.userId,
          status: "approved",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentRow.id));

      const depositApproval = await approvePendingDepositInTx(
        tx,
        depositId,
        req.identity!.userId,
      );

      return {
        payment: {
          ...paymentRow,
          user_id: req.identity!.userId,
          status: "approved" as const,
          amount: paymentRow.amount.toString(),
        },
        depositApproval,
      };
    });

    res.status(200).json({
      success: true,
      payment: result.payment,
      depositApproval: result.depositApproval,
      message: "Deposit approved",
    });
    await notifyApprovedDeposit({
      userId: req.identity.userId,
      agentId: result.payment.agent_id,
      amount: result.payment.amount,
      transactionNumber: result.payment.transaction_number,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "payment_approve_failed";

    if (message === "payment_not_found") {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (message === "payment_already_approved") {
      res.status(409).json({ error: "Payment already approved" });
      return;
    }

    if (message === "payment_claimed_by_other_user") {
      res
        .status(409)
        .json({ error: "Payment already approved for another user" });
      return;
    }

    if (message === "payment_rejected") {
      res.status(409).json({ error: "Payment is rejected" });
      return;
    }

    if (message === "deposit_already_processed") {
      res.status(409).json({ error: "Deposit already processed" });
      return;
    }

    console.error("Approve payment error:", error);
    res.status(500).json({ error: "Failed to approve payment" });
  }
});

router.post("/payments/submit", requireAuth, approvePaymentHandler);

router.post("/payments/approve", requireAuth, approvePaymentHandler);

router.post(
  "/payments/pending/telebirr",
  asyncHandler(async (req, res) => {
    const secret = req.header("x-sms-forwarder-secret");
    if (!env.SMS_FORWARDER_SECRET || secret !== env.SMS_FORWARDER_SECRET) {
      res.status(401).json({ error: "invalid_forwarder_secret" });
      return;
    }

    const { agentTelegramId, sms_content } = req.body ?? {};
    if (
      (typeof agentTelegramId !== "string" &&
        typeof agentTelegramId !== "number") ||
      String(agentTelegramId).trim().length === 0
    ) {
      res.status(400).json({ error: "agent_telegram_id_required" });
      return;
    }
    if (typeof sms_content !== "string" || !sms_content.trim()) {
      res.status(400).json({ error: "sms_content_required" });
      return;
    }

    const agent = await findAgentOrAdminByTelegramId(
      String(agentTelegramId).trim(),
    );

    if (!agent) {
      res.status(404).json({ error: "agent_not_found" });
      return;
    }

    try {
      const payment = await createPendingPaymentRecord({
        agentId: agent.id,
        smsContent: sms_content,
        parser: parseTelebirrPayment,
      });

      res.status(201).json({ success: true, payment });
    } catch (error) {
      // log the full error for debugging, but only return a generic message to the client
      console.error("Error processing pending Telebirr payment:", error);
      const message = error instanceof Error ? error.message : String(error);
      const duplicate =
        message.includes("uq_payments_transaction_number") ||
        message.includes("duplicate key");
      const status =
        message === "airtime_not_supported"
          ? 400
          : message === "parse_failed"
            ? 400
            : duplicate
              ? 409
              : 500;
      res.status(status).json({
        error:
          message === "airtime_not_supported"
            ? "Transaction involves airtime, which is not supported"
            : message === "parse_failed"
              ? "Could not extract all required fields from SMS"
              : duplicate
                ? "Payment with this transaction number already exists"
                : "Failed to store pending payment",
      });
    }
  }),
);

router.post(
  "/payments/pending/cbe",
  asyncHandler(async (req, res) => {
    const secret = req.header("x-sms-forwarder-secret");
    if (!env.SMS_FORWARDER_SECRET || secret !== env.SMS_FORWARDER_SECRET) {
      res.status(401).json({ error: "invalid_forwarder_secret" });
      return;
    }

    const { agentTelegramId, sms_content } = req.body ?? {};
    if (
      (typeof agentTelegramId !== "string" &&
        typeof agentTelegramId !== "number") ||
      String(agentTelegramId).trim().length === 0
    ) {
      res.status(400).json({ error: "agent_telegram_id_required" });
      return;
    }
    if (typeof sms_content !== "string" || !sms_content.trim()) {
      res.status(400).json({ error: "sms_content_required" });
      return;
    }

    const agent = await findAgentOrAdminByTelegramId(
      String(agentTelegramId).trim(),
    );

    if (!agent) {
      res.status(404).json({ error: "agent_not_found" });
      return;
    }

    try {
      const payment = await createPendingPaymentRecord({
        agentId: agent.id,
        smsContent: sms_content,
        parser: parseCbePayment,
      });

      res.status(201).json({ success: true, payment });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const duplicate =
        message.includes("uq_payments_transaction_number") ||
        message.includes("duplicate key");
      const status = message === "parse_failed" ? 400 : duplicate ? 409 : 500;
      res.status(status).json({
        error:
          message === "parse_failed"
            ? "Could not extract all required fields from CBE SMS"
            : duplicate
              ? "Payment with this transaction number already exists"
              : "Failed to store pending payment",
      });
    }
  }),
);

export default router;
