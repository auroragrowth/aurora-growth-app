export async function sendTelegramMessage(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendTelegramWithButtons(
  chatId: string,
  message: string,
  buttons: InlineButton[][]
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: true,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: "Markdown",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
