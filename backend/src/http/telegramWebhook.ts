import { and, eq } from "drizzle-orm";
import { Request, Response, Router } from "express";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { telegramUpdates } from "../db/schema.js";
import { getBot } from "../telegram/bot.js";
import { logger } from "../utils/logger.js";

const router = Router();

function inferTelegramEventType(update: Record<string, unknown>): string {
  if (update.message) return "message";
  if (update.callback_query) return "callback_query";
  if (update.inline_query) return "inline_query";
  if (update.my_chat_member) return "my_chat_member";
  return "unknown";
}

router.post("/telegram/webhook", async (req: Request, res: Response) => {
  logger.info("telegram_webhook_received", {
    requestId: req.requestId,
    contentType: req.header("content-type") ?? null,
    hasBody: Boolean(req.body && Object.keys(req.body).length > 0),
    hasSecretHeader: Boolean(
      req.header("x-telegram-bot-api-secret-token")?.length,
    ),
  });
  if (env.LOCAL_DEV_AUTH_ENABLED) {
    logger.warn("telegram_webhook_skipped_local_dev", {
      requestId: req.requestId,
    });
    res.status(204).send();
    return;
  }

  const secret = req.header("x-telegram-bot-api-secret-token");
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn("telegram_webhook_invalid_secret", {
      requestId: req.requestId,
      receivedLength: secret?.length ?? 0,
    });
    res.status(401).json({ error: "invalid_telegram_secret" });
    return;
  }

  try {
    const update = req.body as Record<string, unknown>;
    if (!update || typeof update !== "object") {
      logger.warn("telegram_webhook_invalid_body", {
        requestId: req.requestId,
        bodyType: typeof req.body,
      });
      res.status(400).json({ error: "invalid_telegram_update" });
      return;
    }

    const updateId = Number(update.update_id);
    const eventType = inferTelegramEventType(update);
    const telegramUserId =
      String(
        (update.message as { from?: { id?: number } } | undefined)?.from?.id ??
          (update.callback_query as { from?: { id?: number } } | undefined)
            ?.from?.id ??
          0,
      ) || "0";

    logger.info("telegram_webhook_parsed_update", {
      requestId: req.requestId,
      updateId,
      eventType,
      telegramUserId,
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
        const [existing] = await db
          .select({
            id: telegramUpdates.id,
            processedAt: telegramUpdates.processedAt,
          })
          .from(telegramUpdates)
          .where(
            and(
              eq(telegramUpdates.updateId, updateId),
              eq(telegramUpdates.eventType, eventType),
            ),
          )
          .limit(1);

        if (existing?.processedAt) {
          logger.info("telegram_webhook_duplicate_processed", {
            requestId: req.requestId,
            updateId,
            eventType,
          });
          res.status(200).json({ ok: true, duplicate: true });
          return;
        }

        logger.warn("telegram_webhook_retry_unprocessed", {
          requestId: req.requestId,
          updateId,
          eventType,
          recordId: existing?.id ?? null,
        });
      }
    }

    try {
      await getBot().handleUpdate(req.body);
      logger.info("telegram_webhook_bot_handled", {
        requestId: req.requestId,
        updateId,
        eventType,
      });
    } catch (botError) {
      logger.error("telegram_webhook_bot_error", {
        requestId: req.requestId,
        updateId,
        eventType,
        message:
          botError instanceof Error ? botError.message : String(botError),
      });
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

    logger.info("telegram_webhook_processed", {
      requestId: req.requestId,
      updateId,
      eventType,
      statusCode: 200,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("telegram_webhook_failed", {
      requestId: req.requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: "telegram_update_failed" });
  }
});

export default router;
