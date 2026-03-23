import { clearTelegramWebhook } from "./setup.js";

async function main() {
  await clearTelegramWebhook();
  console.log("Telegram webhook cleared.");
}

void main();
