export function auroraEmailLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Aurora Growth</title>
</head>
<body style="margin:0;padding:0;background:#020b22;font-family:Inter,Arial,sans-serif;color:#edf3ff;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#020b22 0%,#081734 50%,#0a1f49 100%);min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 32px 0;text-align:center;">
<div style="display:inline-block;padding:12px 24px;background:rgba(7,16,38,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
<span style="font-size:20px;font-weight:800;color:#57d3f3;letter-spacing:-0.02em;">&#10022; Aurora Growth</span>
</div>
</td></tr>
<tr><td style="background:rgba(15,26,58,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:40px;backdrop-filter:blur(16px);">
${content}
</td></tr>
<tr><td style="padding:32px 0 0 0;text-align:center;">
<p style="margin:0 0 8px;color:#4a5a7a;font-size:13px;">Aurora Growth &middot; Premium Investment Platform</p>
<p style="margin:0 0 8px;color:#4a5a7a;font-size:13px;">
<a href="https://app.auroragrowth.co.uk" style="color:#57d3f3;text-decoration:none;">app.auroragrowth.co.uk</a>
</p>
<p style="margin:0;color:#2a3a5a;font-size:12px;">
This email was sent by Aurora Growth.
<a href="https://app.auroragrowth.co.uk/unsubscribe" style="color:#2a3a5a;">Unsubscribe</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const signOff = `
<p style="margin:32px 0 0;padding:24px;background:rgba(87,211,243,0.05);border:1px solid rgba(87,211,243,0.1);border-radius:16px;font-size:14px;line-height:1.6;color:#aebbd6;">
  Best regards,<br>
  <strong style="color:#edf3ff;">The Aurora Growth Academy Onboarding Team</strong><br>
  <span style="color:#57d3f3;">Aurora Growth Academy</span>
</p>`

const divider = `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;"/>`

function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;line-height:1.2;color:#ffffff;">${text}</h1>`
}

function subheading(text: string) {
  return `<h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#edf3ff;">${text}</h2>`
}

function body(text: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#aebbd6;">${text}</p>`
}

function cta(text: string, url: string) {
  return `<div style="margin:24px 0;text-align:center;">
<a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#63d3ff,#6f86ff,#b267ff);color:#fff;text-decoration:none;font-weight:700;font-size:16px;border-radius:999px;box-shadow:0 8px 24px rgba(91,123,255,0.3);">${text}</a>
</div>`
}

function featureRow(icon: string, title: string, desc: string) {
  return `<tr>
<td width="48" valign="top" style="padding:0 16px 20px 0;">
<div style="width:40px;height:40px;background:rgba(87,211,243,0.1);border:1px solid rgba(87,211,243,0.2);border-radius:12px;text-align:center;line-height:40px;font-size:20px;">${icon}</div>
</td>
<td valign="top" style="padding:0 0 20px;">
<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#edf3ff;">${title}</p>
<p style="margin:0;font-size:14px;color:#8a9ac0;line-height:1.5;">${desc}</p>
</td>
</tr>`
}

export function welcomeEmail(firstName: string): string {
  const content = `
${heading(`Welcome to Aurora Growth, ${firstName}`)}
${body('You\'re now part of the Aurora Growth Academy. Over the next few days, our onboarding team will guide you step by step through the platform so you can start investing with more clarity and structure.')}
${divider}
${subheading('What you now have access to')}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
${featureRow('&#128269;', 'Market Scanner', 'Identify high-conviction opportunities across 136+ scored stocks')}
${featureRow('&#11088;', 'Smart Watchlists', 'Track stocks with Live and Demo modes for full portfolio visibility')}
${featureRow('&#128202;', 'Investment Calculator', 'Plan staged entries with the Aurora ladder methodology')}
${featureRow('&#128276;', 'Telegram Alerts', 'Get instant notifications when your price levels are hit')}
${featureRow('&#10022;', 'Aurora Intelligence', 'AI-powered analysis on every stock in your watchlist')}
</table>
${divider}
${cta('Open Aurora Dashboard &rarr;', 'https://app.auroragrowth.co.uk/dashboard')}
${body('Look out for your next email tomorrow &mdash; we\'ll show you exactly how to find your first Aurora opportunity.')}
${signOff}`
  return auroraEmailLayout(content, `Welcome to Aurora Growth, ${firstName}! Your premium investment platform is ready.`)
}

export function subscriptionConfirmedEmail(firstName: string, planName: string): string {
  const content = `
${heading(`You're now on Aurora ${planName}, ${firstName}`)}
${body(`Your ${planName} subscription is now active. You have full access to the Aurora Growth platform.`)}
${divider}
${body('Your plan includes everything you need to invest with structure and confidence. Start by running the market scanner to see what opportunities Aurora has identified today.')}
${cta('Go to Dashboard &rarr;', 'https://app.auroragrowth.co.uk/dashboard')}
${signOff}`
  return auroraEmailLayout(content, `Your Aurora ${planName} subscription is confirmed.`)
}

export function paymentFailedEmail(firstName: string): string {
  const content = `
<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#f87171;">Payment Issue &mdash; Action Required</h1>
${body(`Hi ${firstName}, we weren't able to process your Aurora subscription payment.`)}
${body('Your access remains active while we attempt to resolve this. Please update your payment details to avoid any interruption.')}
${cta('Update Payment Details &rarr;', 'https://app.auroragrowth.co.uk/dashboard/account')}
${body('If you need help, reply to this email and our team will assist you.')}
${signOff}`
  return auroraEmailLayout(content, 'Action required: Aurora payment could not be processed.')
}

export function opportunityDetectedEmail(firstName: string, ticker: string): string {
  const content = `
${heading(`Aurora Signal: ${ticker} is showing strength`)}
${body(`Hi ${firstName}, the Aurora scanner has detected a high-conviction opportunity in <strong style="color:#57d3f3;">${ticker}</strong>.`)}
${body('The stock meets Aurora\'s criteria for momentum, fundamentals, and score. Now may be a good time to review this in your investment calculator.')}
${cta(`Analyse ${ticker} Now &rarr;`, `https://app.auroragrowth.co.uk/dashboard/stocks/${ticker}`)}
${signOff}`
  return auroraEmailLayout(content, `Aurora has detected a signal for ${ticker}.`)
}

export function pullbackAlertEmail(firstName: string, ticker: string, level: string): string {
  const content = `
${heading(`${ticker} has hit your entry level`)}
${body(`Hi ${firstName}, <strong style="color:#57d3f3;">${ticker}</strong> has reached your ladder entry level of <strong style="color:#f59e0b;">${level}</strong>.`)}
${body('This is the level you identified as a potential entry point in your Aurora investment ladder. Consider reviewing the full analysis before acting.')}
${cta(`Review ${ticker} &rarr;`, `https://app.auroragrowth.co.uk/dashboard/stocks/${ticker}`)}
${signOff}`
  return auroraEmailLayout(content, `${ticker} has reached your entry level of ${level}.`)
}

export function bepReachedEmail(firstName: string, ticker: string): string {
  const content = `
${heading(`${ticker} has reached your BEP`)}
${body(`Hi ${firstName}, <strong style="color:#57d3f3;">${ticker}</strong> has risen to your break-even price. Your position is now at or above cost.`)}
${body('You can now review your profit targets and decide whether to hold for further gains or take a partial position.')}
${cta(`Review ${ticker} &rarr;`, `https://app.auroragrowth.co.uk/dashboard/stocks/${ticker}`)}
${signOff}`
  return auroraEmailLayout(content, `${ticker} has reached your break-even price.`)
}

export function profitTargetEmail(firstName: string, ticker: string, target: string): string {
  const content = `
${heading(`${ticker} has hit your profit target`)}
${body(`Hi ${firstName}, <strong style="color:#57d3f3;">${ticker}</strong> has reached your profit target of <strong style="color:#22c55e;">${target}</strong>.`)}
${body('Congratulations on a successful Aurora ladder position. Review your current holdings and consider your next steps.')}
${cta(`Review ${ticker} &rarr;`, `https://app.auroragrowth.co.uk/dashboard/stocks/${ticker}`)}
${signOff}`
  return auroraEmailLayout(content, `${ticker} has hit your profit target of ${target}.`)
}
