// USER ALERTS — sends to individual user chat_ids

export async function sendUserAlert(
  chatId: string,
  message: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return { success: false }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    )
    const data = await res.json()
    return { success: data.ok, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function priceAlertMessage(
  symbol: string,
  company: string,
  alertType: 'above' | 'below' | 'entry_level',
  targetPrice: number,
  currentPrice: number
): string {
  const icon = alertType === 'above' ? '📈' : '📉'
  const typeText = alertType === 'above'
    ? 'risen above your target'
    : alertType === 'entry_level'
    ? 'hit your Aurora entry level'
    : 'dropped to your target'

  return `${icon} *Aurora Price Alert*

*${symbol}* — ${company}

${symbol} has ${typeText} of *$${targetPrice.toFixed(2)}*

Current price: $${currentPrice.toFixed(2)}

_Review your position in Aurora Growth_`
}

export function welcomeMessage(firstName: string): string {
  return `✦ *Aurora Growth — Connected!*

Welcome ${firstName}! Your Telegram is now linked.

You will receive alerts here when:
📈 A stock rises above your target
📉 A stock drops to your entry level
⚡ An Aurora ladder entry is triggered

_Aurora Growth — Invest with clarity_`
}
