// AURORA GROWTH ADMIN BOT
// Bot: @auroragrowth_admin_bot
// Sends ONLY to paulrudland@me.com (chat_id: 7881047668)
// Uses TELEGRAM_ADMIN_BOT_TOKEN — separate from user alerts bot

const ADMIN_CHAT_ID = "7881047668";

function ts() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendAdmin(text: string) {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) {
    console.warn("[Admin Bot] TELEGRAM_ADMIN_BOT_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text,
          parse_mode: "Markdown",
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[Admin Bot] Failed:", err);
    }
  } catch (e) {
    console.error("[Admin Bot] Error:", e);
  }
}

// ── Legacy wrapper used by post-login and stripe webhook ──

interface AdminNotification {
  type: "login" | "error" | "build" | "server" | "signup" | "payment" | "info";
  title: string;
  message: string;
  data?: Record<string, string>;
}

const ICONS: Record<string, string> = {
  login: "🔐",
  error: "🚨",
  build: "🔨",
  server: "🖥️",
  signup: "🎉",
  payment: "💳",
  info: "ℹ️",
};

export async function notifyAdmin(notification: AdminNotification) {
  const icon = ICONS[notification.type] || "ℹ️";
  let text = `${icon} *${notification.title}*\n\n${notification.message}`;

  if (notification.data) {
    text += "\n\n";
    for (const [key, val] of Object.entries(notification.data)) {
      text += `• ${key}: \`${val}\`\n`;
    }
  }

  text += `\n\n_${ts()}_`;
  await sendAdmin(text);
}

export async function sendAdminAlert(
  message: string,
  severity: "info" | "warning" | "error" | "critical" = "info"
) {
  const typeMap: Record<string, AdminNotification["type"]> = {
    info: "info",
    warning: "server",
    error: "error",
    critical: "error",
  };
  await notifyAdmin({
    type: typeMap[severity] || "info",
    title: "Aurora Alert",
    message,
  });
}

// ── Convenience functions ──

export const adminNotify = {
  login: (email: string) =>
    sendAdmin(`🔐 *User Login*\n\n\`${email}\` logged in.\n_${ts()}_`),

  signup: (email: string, plan?: string) =>
    sendAdmin(
      `🎉 *New Signup!*\n\nEmail: \`${email}\`\nPlan: ${plan || "not selected"}\n_${ts()}_`
    ),

  planSelected: (email: string, plan: string) =>
    sendAdmin(
      `📋 *Plan Selected*\n\nEmail: \`${email}\`\nPlan: *${plan.toUpperCase()}*\n_${ts()}_`
    ),

  payment: (email: string, plan: string, amount?: string) =>
    sendAdmin(
      `💰 *Payment Received*\n\nEmail: \`${email}\`\nPlan: *${plan.toUpperCase()}*\n${amount ? `Amount: ${amount}\n` : ""}_${ts()}_`
    ),

  brokerConnected: (email: string, mode: string) =>
    sendAdmin(
      `🔗 *Broker Connected*\n\n\`${email}\` connected *${mode.toUpperCase()}* T212 account.\n_${ts()}_`
    ),

  watchlistAdd: (email: string, symbol: string) =>
    sendAdmin(
      `⭐ *Watchlist Add*\n\n\`${email}\` added *${symbol}* to watchlist.\n_${ts()}_`
    ),

  alertSet: (email: string, symbol: string, type: string, price: number) =>
    sendAdmin(
      `🔔 *Alert Set*\n\n\`${email}\` set ${type} alert on *${symbol}* at *$${price.toFixed(2)}*\n_${ts()}_`
    ),

  telegramConnected: (email: string) =>
    sendAdmin(
      `📱 *Telegram Connected*\n\n\`${email}\` connected their Telegram.\n_${ts()}_`
    ),

  serverRestart: (site: string) =>
    sendAdmin(
      `🔄 *Server Restarted*\n\nAurora Growth *${site}* restarted.\n_${ts()}_`
    ),

  build: (version: string, status: "success" | "failed" | "started") =>
    sendAdmin(
      `${status === "success" ? "✅" : status === "failed" ? "❌" : "🔨"} *Build ${status}*\n\nVersion: ${version}\n_${ts()}_`
    ),

  error: (route: string, message: string, email?: string) =>
    sendAdmin(
      `🚨 *Error*\n\nRoute: \`${route}\`\n${email ? `User: \`${email}\`\n` : ""}Error: ${message.slice(0, 200)}\n_${ts()}_`
    ),

  dailySummary: (stats: {
    total: number;
    active: number;
    telegram: number;
    alerts: number;
    plans: { elite: number; pro: number; core: number };
  }) =>
    sendAdmin(
      `📊 *Daily Summary*\n\n👥 Total users: *${stats.total}*\n✅ Active: *${stats.active}*\n📱 Telegram: *${stats.telegram}*\n🔔 Active alerts: *${stats.alerts}*\n\nPlans:\n• Elite: ${stats.plans.elite}\n• Pro: ${stats.plans.pro}\n• Core: ${stats.plans.core}\n\n_${ts()}_`
    ),

  info: (title: string, message: string) =>
    sendAdmin(`ℹ️ *${title}*\n\n${message}\n_${ts()}_`),
};

export default adminNotify;
