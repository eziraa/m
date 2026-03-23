import { configureTelegramBot } from "./setup.js";

async function main() {
  await configureTelegramBot({ requireWebhook: true });
  console.log("Telegram webhook and commands configured.");
}

void main();
