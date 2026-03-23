import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getBot } from "./bot.js";

export const TELEGRAM_BOT_COMMANDS = [
  { command: "start", description: "Open the app and get started" },
  { command: "play", description: "Launch the game rooms" },
  { command: "deposit", description: "Open the deposit screen" },
  { command: "withdraw", description: "Open the withdrawal screen" },
  { command: "help", description: "Show quick help and app shortcuts" },
] as const;

type ConfigureTelegramBotOptions = {
  requireWebhook?: boolean;
};

export async function configureTelegramBot(
  options: ConfigureTelegramBotOptions = {},
) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn("telegram_bot_setup_skipped", { reason: "missing_bot_token" });
    return { commandsConfigured: false, webhookConfigured: false };
  }

  const bot = getBot();
  await bot.telegram.setMyCommands([...TELEGRAM_BOT_COMMANDS]);

  let webhookConfigured = false;
  if (env.TELEGRAM_WEBHOOK_URL) {
    await bot.telegram.setWebhook(env.TELEGRAM_WEBHOOK_URL, {
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    webhookConfigured = true;
  } else if (options.requireWebhook) {
    throw new Error("missing_telegram_webhook_url");
  }

  logger.info("telegram_bot_configured", {
    commandsConfigured: true,
    webhookConfigured,
    webhookUrl: env.TELEGRAM_WEBHOOK_URL || null,
  });

  return {
    commandsConfigured: true,
    webhookConfigured,
  };
}

export async function clearTelegramWebhook() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn("telegram_webhook_clear_skipped", {
      reason: "missing_bot_token",
    });
    return;
  }

  const bot = getBot();
  await bot.telegram.deleteWebhook({ drop_pending_updates: false });
  logger.info("telegram_webhook_cleared");
}
