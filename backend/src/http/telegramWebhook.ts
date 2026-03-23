import { and, eq } from "drizzle-orm";
import { Request, Response, Router } from "express";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { telegramUpdates } from "../db/schema.js";
import { getBot } from "../telegram/bot.js";

const router = Router();

function inferTelegramEventType(update: Record<string, unknown>): string {
  if (update.message) return "message";
  if (update.callback_query) return "callback_query";
  if (update.inline_query) return "inline_query";
  if (update.my_chat_member) return "my_chat_member";
  return "unknown";
}

router.post("/telegram/webhook", async (req: Request, res: Response) => {
  console.log("[WEBHOOK] Incoming request", {
    headers: req.headers,
    body: req.body,
  });
  if (env.LOCAL_DEV_AUTH_ENABLED) {
    console.log(
      "[WEBHOOK] LOCAL_DEV_AUTH_ENABLED is true, skipping processing",
    );
    res.status(204).send();
    return;
  }

  const secret = req.header("x-telegram-bot-api-secret-token");
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn("[WEBHOOK] Invalid secret token", { received: secret });
    res.status(401).json({ error: "invalid_telegram_secret" });
    return;
  }

  try {
    const update = req.body as Record<string, unknown>;
    const updateId = Number(update.update_id);
    const eventType = inferTelegramEventType(update);
    const telegramUserId =
      String(
        (update.message as { from?: { id?: number } } | undefined)?.from?.id ??
          (update.callback_query as { from?: { id?: number } } | undefined)
            ?.from?.id ??
          0,
      ) || "0";

    console.log("[WEBHOOK] Parsed update", {
      updateId,
      eventType,
      telegramUserId,
      update,
    });

    if (Number.isFinite(updateId) && updateId > 0) {
      const inserted = await db
        .insert(telegramUpdates)
        .values({
          updateId,
          eventType,
          telegramUserId,
          payload: update,
        })
        .onConflictDoNothing()
        .returning({ id: telegramUpdates.id });

      if (inserted.length === 0) {
        console.log("[WEBHOOK] Duplicate update", { updateId });
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
    }

    try {
      await getBot().handleUpdate(req.body);
      console.log("[WEBHOOK] Bot handled update successfully");
    } catch (botError) {
      console.error("[WEBHOOK] Error in bot.handleUpdate", botError);
      throw botError;
    }

    if (Number.isFinite(updateId) && updateId > 0) {
      await db
        .update(telegramUpdates)
        .set({ processedAt: new Date() })
        .where(
          and(
            eq(telegramUpdates.updateId, updateId),
            eq(telegramUpdates.eventType, eventType),
          ),
        );
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[WEBHOOK] Error handling update", err);
    res.status(500).json({ error: "telegram_update_failed" });
  }
});

export default router;
