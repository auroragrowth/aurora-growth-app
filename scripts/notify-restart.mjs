import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const chatId = "7881047668";
const site =
  process.env.APP_ENV || (process.env.PORT === "3001" ? "DEV" : "LIVE");

if (!token) {
  console.log("[Restart] No admin token");
  process.exit(0);
}

const now = new Date().toLocaleString("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

try {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🔄 *Aurora Growth ${site} Restarted*\n\nServer restarted successfully.\n_${now}_`,
      parse_mode: "Markdown",
    }),
  });
  console.log("[Restart] Admin notified ✅");
} catch (e) {
  console.log("[Restart] Error:", e.message);
}
