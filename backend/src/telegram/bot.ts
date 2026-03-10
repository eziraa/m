import { Telegraf } from "telegraf";

import { env } from "../config/env.js";

let botRef: Telegraf | null = null;

export function getBot(): Telegraf {
  if (botRef) return botRef;

  botRef = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  botRef.start(async (ctx) => {
    const payload = ctx.startPayload ?? "";
    const launchUrl = payload
      ? `${env.FRONTEND_MINIAPP_URL}?start=${encodeURIComponent(payload)}`
      : env.FRONTEND_MINIAPP_URL;

    await ctx.reply("Welcome to M-Bingo. Open the Mini App to play.", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Mini App",
              web_app: {
                url: launchUrl,
              },
            },
          ],
        ],
      },
    });
  });

  botRef.command("help", async (ctx) => {
    await ctx.reply("Use the Mini App to join your agent room and play bingo.");
  });

  botRef.command("mini", async (ctx) => {
    await ctx.reply("Open M-Bingo Mini App:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Mini App",
              web_app: {
                url: env.FRONTEND_MINIAPP_URL,
              },
            },
          ],
        ],
      },
    });
  });

  return botRef;
}
