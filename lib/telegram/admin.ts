export async function sendAdminAlert(
  message: string,
  severity: "info" | "warning" | "error" | "critical" = "info"
) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) return;

    const emoji = {
      info: "\u2139\uFE0F",
      warning: "\u26A0\uFE0F",
      error: "\uD83D\uDD34",
      critical: "\uD83D\uDEA8",
    }[severity];

    const text = `${emoji} *Aurora Alert*\n\n${message}\n\n_${new Date().toISOString()}_`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.error("Telegram alert failed:", e);
  }
}
