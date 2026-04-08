import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const chatId = "7881047668";

if (!token) {
  console.log("No admin bot token");
  process.exit(0);
}

const { data: profiles } = await supabase
  .from("profiles")
  .select("plan_key, subscription_status, telegram_connected");

const { data: alerts } = await supabase
  .from("price_alerts")
  .select("id")
  .eq("is_active", true);

const { data: watchlistCount } = await supabase
  .from("watchlist_live")
  .select("id");

const total = profiles?.length || 0;
const active =
  profiles?.filter((p) => p.subscription_status === "active").length || 0;
const telegramUsers =
  profiles?.filter((p) => p.telegram_connected).length || 0;
const plans = {
  elite: profiles?.filter((p) => p.plan_key === "elite").length || 0,
  pro: profiles?.filter((p) => p.plan_key === "pro").length || 0,
  core: profiles?.filter((p) => p.plan_key === "core").length || 0,
};

const now = new Date().toLocaleString("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const message = `📊 *Aurora Growth — Daily Summary*
_${now}_

👥 Total users: *${total}*
✅ Active subscriptions: *${active}*
📱 Telegram connected: *${telegramUsers}*
🔔 Active price alerts: *${alerts?.length || 0}*
⭐ Watchlist stocks: *${watchlistCount?.length || 0}*

Plans:
- Elite: ${plans.elite}
- Pro: ${plans.pro}
- Core: ${plans.core}`;

await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
  }),
});

console.log("Daily summary sent ✅");
