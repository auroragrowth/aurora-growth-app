// ADMIN ONLY — sends to paulrudland@me.com exclusively
// Never use this for regular user alerts

const ADMIN_CHAT_ID = '7881047668'

interface AdminNotification {
  type: 'login' | 'error' | 'build' | 'server' | 'signup' | 'payment' | 'info'
  title: string
  message: string
  data?: Record<string, string>
}

const ICONS: Record<string, string> = {
  login: '🔐',
  error: '🚨',
  build: '🔨',
  server: '🖥️',
  signup: '🎉',
  payment: '💳',
  info: 'ℹ️',
}

export async function notifyAdmin(notification: AdminNotification) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const icon = ICONS[notification.type] || 'ℹ️'

  let text = `${icon} *${notification.title}*\n\n${notification.message}`

  if (notification.data) {
    text += '\n\n'
    for (const [key, val] of Object.entries(notification.data)) {
      text += `• ${key}: \`${val}\`\n`
    }
  }

  text += `\n\n_${new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}_`

  try {
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text,
          parse_mode: 'Markdown'
        })
      }
    )
  } catch (e) {
    console.error('[Admin Telegram] Failed:', e)
  }
}

// Backward-compatible wrapper for existing callers
export async function sendAdminAlert(
  message: string,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
) {
  const typeMap: Record<string, AdminNotification['type']> = {
    info: 'info',
    warning: 'server',
    error: 'error',
    critical: 'error',
  }
  await notifyAdmin({
    type: typeMap[severity] || 'info',
    title: 'Aurora Alert',
    message,
  })
}

// Convenience functions
export const adminNotify = {
  login: (email: string, ip?: string) => notifyAdmin({
    type: 'login',
    title: 'User Login',
    message: `A user has logged in to Aurora Growth.`,
    data: {
      email,
      ...(ip ? { ip } : {})
    }
  }),

  signup: (email: string, plan?: string) => notifyAdmin({
    type: 'signup',
    title: 'New Signup!',
    message: `A new user has signed up to Aurora Growth.`,
    data: {
      email,
      plan: plan || 'unknown'
    }
  }),

  payment: (email: string, plan: string, amount?: string) => notifyAdmin({
    type: 'payment',
    title: 'Payment Received',
    message: `A subscription payment was processed.`,
    data: {
      email,
      plan,
      ...(amount ? { amount } : {})
    }
  }),

  error: (route: string, message: string, user?: string) => notifyAdmin({
    type: 'error',
    title: 'Application Error',
    message: `An error occurred on Aurora Growth.`,
    data: {
      route,
      error: message.slice(0, 100),
      ...(user ? { user } : {})
    }
  }),

  server: (message: string) => notifyAdmin({
    type: 'server',
    title: 'Server Event',
    message
  }),

  build: (version: string, status: 'started' | 'success' | 'failed') => notifyAdmin({
    type: 'build',
    title: `Build ${status === 'success' ? '✅' : status === 'failed' ? '❌' : '🔨'}`,
    message: `Aurora Growth ${version} build ${status}.`,
    data: { version, status }
  }),

  info: (title: string, message: string) => notifyAdmin({
    type: 'info',
    title,
    message
  })
}
