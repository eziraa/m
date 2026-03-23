import { eq } from "drizzle-orm";
import { Context, Telegraf } from "telegraf";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

let botRef: Telegraf | null = null;

type LaunchTarget = "play" | "deposit" | "withdraw";

type BotUserSnapshot = {
  id: string;
  firstName: string | null;
  username: string | null;
};

function buildMiniAppUrl(target: LaunchTarget, referralCode?: string) {
  const routeMap: Record<LaunchTarget, string> = {
    play: "/rooms",
    deposit: "/deposit",
    withdraw: "/withdraw",
  };
  const baseUrl = new URL(routeMap[target], env.FRONTEND_MINIAPP_URL);
  if (referralCode) {
    baseUrl.searchParams.set("ref", referralCode);
  }
  return baseUrl.toString();
}

async function findTelegramUser(
  telegramId?: number,
): Promise<BotUserSnapshot | null> {
  if (!telegramId) return null;

  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.telegramId, String(telegramId)))
    .limit(1);

  return user ?? null;
}

function getDisplayName(ctx: Context) {
  const telegramName =
    ctx.from?.first_name?.trim() ||
    ctx.from?.username?.trim() ||
    "there";
  return telegramName;
}

function buildLaunchKeyboard(referralCode?: string) {
  return {
    inline_keyboard: [
      [
        {
          text: "Play now",
          web_app: { url: buildMiniAppUrl("play", referralCode) },
        },
      ],
      [
        {
          text: "Deposit",
          web_app: { url: buildMiniAppUrl("deposit", referralCode) },
        },
        {
          text: "Withdraw",
          web_app: { url: buildMiniAppUrl("withdraw", referralCode) },
        },
      ],
    ],
  };
}

async function replyWithLaunchOptions(
  ctx: Context,
  target: LaunchTarget | "all",
  options?: {
    greeting?: string;
    referralCode?: string;
  },
) {
  const referralCode = options?.referralCode;
  const keyboard =
    target === "all"
      ? buildLaunchKeyboard(referralCode)
      : {
          inline_keyboard: [
            [
              {
                text:
                  target === "play"
                    ? "Play now"
                    : target === "deposit"
                      ? "Deposit"
                      : "Withdraw",
                web_app: { url: buildMiniAppUrl(target, referralCode) },
              },
            ],
            ...buildLaunchKeyboard(referralCode).inline_keyboard.slice(1),
          ],
        };

  const lines = [
    options?.greeting ??
      "Open M-Bingo in Telegram and choose what you want to do.",
    "Use the buttons below to launch the app instantly.",
  ];

  if (referralCode) {
    lines.push("Your invite link is attached, so your referral will be kept.");
  }

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: keyboard,
  });
}

export function getBot(): Telegraf {
  if (botRef) return botRef;

  botRef = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  botRef.telegram.webhookReply = false;

  botRef.catch((error, ctx) => {
    console.error("[TELEGRAM] Unhandled bot error", {
      updateId: ctx.update.update_id,
      chatId: ctx.chat?.id,
      fromId: ctx.from?.id,
      error,
    });
    throw error;
  });

  botRef.start(async (ctx) => {
    const payload = ctx.startPayload ?? "";
    const existingUser = await findTelegramUser(ctx.from?.id);
    const name = existingUser?.firstName || getDisplayName(ctx);
    const greeting = existingUser
      ? `Welcome back, ${name}. Ready to continue?`
      : `Welcome ${name}! Your account will be ready as soon as you open the app.`;

    await replyWithLaunchOptions(ctx, "all", {
      greeting,
      referralCode: payload || undefined,
    });
  });

  botRef.command("help", async (ctx) => {
    await replyWithLaunchOptions(ctx, "all", {
      greeting:
        "Use these shortcuts to launch the Mini App, deposit funds, or request a withdrawal.",
    });
  });

  botRef.command("play", async (ctx) => {
    await replyWithLaunchOptions(ctx, "play");
  });

  botRef.command("deposit", async (ctx) => {
    await replyWithLaunchOptions(ctx, "deposit");
  });

  botRef.command("withdraw", async (ctx) => {
    await replyWithLaunchOptions(ctx, "withdraw");
  });

  botRef.command("mini", async (ctx) => {
    await replyWithLaunchOptions(ctx, "play", {
      greeting: "Open M-Bingo Mini App:",
    });
  });

  return botRef;
}
