const LOGO = 'https://auroragrowth.co.uk/wp-content/uploads/2026/04/Aurora_Logo_email.png'
const APP = 'https://app.auroragrowth.co.uk'

function wrap(badge: string, title: string, intro: string, ctaLabel: string, ctaUrl: string, greeting: string, bodyHtml: string, secondaryCta?: { label: string; url: string }): string {
  const secondary = secondaryCta
    ? `<td style="padding-bottom:10px;"><a href="${secondaryCta.url}" style="display:inline-block;background:rgba(10,20,39,0.82);color:#eaf4ff;text-decoration:none;font-weight:700;border-radius:999px;padding:14px 24px;font-size:15px;border:1px solid rgba(83,175,255,0.28);">${secondaryCta.label}</a></td>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aurora Growth Academy</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#eaf4ff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#020617 0%,#04101f 35%,#020617 100%);">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;background:rgba(8,20,42,0.92);border:1px solid rgba(83,175,255,0.18);border-radius:24px;overflow:hidden;">

          <tr>
            <td style="padding:34px 32px 24px 32px;background:
              radial-gradient(circle at top left, rgba(36,215,238,0.18), transparent 30%),
              radial-gradient(circle at top right, rgba(139,92,246,0.18), transparent 30%),
              linear-gradient(180deg,#071123 0%,#04101f 100%);
              border-bottom:1px solid rgba(83,175,255,0.18);">
              <img src="${LOGO}" alt="Aurora Growth Academy" style="height:48px;width:auto;display:block;margin-bottom:18px;">
              <div style="display:inline-block;padding:9px 14px;border-radius:999px;border:1px solid rgba(36,215,238,0.24);background:rgba(8,16,35,0.8);color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:18px;">
                ${badge}
              </div>
              <h1 style="margin:0 0 14px 0;font-size:34px;line-height:1.1;color:#ffffff;">${title}</h1>
              <p style="margin:0 0 24px 0;font-size:17px;line-height:1.8;color:#a9bfd8;">${intro}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px;padding-bottom:10px;">
                    <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,#24d7ee,#8b5cf6);color:#04101f;text-decoration:none;font-weight:700;border-radius:999px;padding:15px 24px;font-size:15px;">${ctaLabel}</a>
                  </td>
                  ${secondary}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:17px;line-height:1.85;color:#dbe8f8;">Hi ${greeting},</p>
            </td>
          </tr>

          ${bodyHtml}

          <tr>
            <td style="padding:28px 32px 34px 32px;text-align:center;font-size:14px;line-height:1.8;color:#88a1bb;">
              Best regards,<br>
              <strong style="color:#eaf4ff;">The Aurora Growth Academy Onboarding Team</strong><br>
              Aurora Growth Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function section(label: string, contentHtml: string): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="background:linear-gradient(180deg,rgba(8,20,42,0.95),rgba(5,12,24,0.94));border:1px solid rgba(83,175,255,0.16);border-radius:22px;padding:24px;">
                <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">${label}</div>
                <div style="color:#eaf4ff;font-size:16px;line-height:1.9;">${contentHtml}</div>
              </div>
            </td>
          </tr>`
}

function textBlock(html: string): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <p style="margin:0;font-size:16px;line-height:1.85;color:#a9bfd8;">${html}</p>
            </td>
          </tr>`
}

function ctaBlock(label: string, url: string): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;text-align:center;">
              <a href="${url}" style="display:inline-block;background:linear-gradient(90deg,#24d7ee,#8b5cf6);color:#04101f;text-decoration:none;font-weight:700;border-radius:999px;padding:15px 24px;font-size:15px;">${label}</a>
            </td>
          </tr>`
}

function stepSection(title: string, intro: string, steps: { num: number; title: string; desc: string }[]): string {
  const stepsHtml = steps.map(s => `
    <tr>
      <td width="44" valign="top" style="padding:0 12px 16px 0;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,rgba(36,215,238,0.2),rgba(139,92,246,0.2));border:1px solid rgba(83,175,255,0.2);border-radius:10px;text-align:center;line-height:36px;font-size:16px;font-weight:800;color:#70ebff;">${s.num}</div>
      </td>
      <td valign="top" style="padding:0 0 16px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#eaf4ff;">${s.title}</p>
        <p style="margin:0;font-size:14px;color:#a9bfd8;line-height:1.6;">${s.desc}</p>
      </td>
    </tr>`).join('')

  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="background:linear-gradient(180deg,rgba(8,20,42,0.95),rgba(5,12,24,0.94));border:1px solid rgba(83,175,255,0.16);border-radius:22px;padding:24px;">
                <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">${title}</div>
                <div style="color:#eaf4ff;font-size:16px;line-height:1.9;margin-bottom:20px;">${intro}</div>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0;">${stepsHtml}</table>
              </div>
            </td>
          </tr>`
}

function nextStepBox(html: string): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="background:rgba(8,20,42,0.6);border:1px solid rgba(83,175,255,0.12);border-radius:16px;padding:20px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#a9bfd8;">${html}</p>
              </div>
            </td>
          </tr>`
}

// ═══════════════════════════════════════
// SYSTEM EMAILS
// ═══════════════════════════════════════

export function subscriptionConfirmedEmail(firstName: string, planName: string): string {
  const safe = firstName || 'there'
  return wrap(
    'Subscription Active',
    `Your Aurora ${planName} plan is now live.`,
    `Your ${planName} membership is active and ready to use. You now have full access to the Aurora Growth platform.`,
    'Go to Dashboard',
    `${APP}/dashboard`,
    safe,
    section('Plan Summary', `
      You now have access to all the features included in your <strong>${planName}</strong> plan.<br><br>
      Your next step is to log in, review your dashboard, and start building your watchlist and investment plan.
    `) +
    section('Best next steps', `
      &bull; Review your dashboard<br>
      &bull; Set up your watchlist<br>
      &bull; Explore the scanner<br>
      &bull; Use the calculator to plan entries
    `) +
    stepSection('How to connect your Trading 212 account', `
      Connecting your Trading 212 account takes about two minutes. You can connect your Live account, your Practice account, or both &mdash; each one needs its own API key.<br><br>
      <strong style="color:#f59e0b;">Important:</strong> You need to do this on a desktop or laptop computer. The API settings are not available in the Trading 212 mobile app.
    `, [
      { num: 1, title: 'Log in to Trading 212', desc: 'Go to trading212.com and log in to your account as normal.' },
      { num: 2, title: 'Open your account settings', desc: 'Click your profile icon or initials in the top-right corner of the platform. From the menu that appears, click <strong>Settings</strong>.' },
      { num: 3, title: 'Find the API section', desc: 'In the settings panel on the left-hand side, scroll down and click <strong>API</strong>.' },
      { num: 4, title: 'Enable API access', desc: 'You will see a toggle labelled <strong>Enable API access</strong>. Switch it ON. If you want to connect both Live and Practice accounts, repeat this for each one &mdash; Trading 212 keeps them completely separate.' },
      { num: 5, title: 'Generate your key', desc: 'Once API access is enabled, click <strong>Generate</strong>. Your API key will be shown on screen &mdash; copy it immediately. It will only be shown once and cannot be retrieved again.' },
      { num: 6, title: 'Paste your key into Aurora', desc: 'Go to your Aurora dashboard, open the <strong>Connections</strong> page, select Live or Practice, paste your key, and click Connect. Aurora will test the connection automatically.' },
    ]) +
    section('Connecting both accounts', `
      If you want to use both Live and Demo modes in Aurora, generate a separate key for each account type in Trading 212 and connect them both on the Connections page.<br><br>
      Once both are connected, you can switch between Live and Demo mode using the toggle in the top bar of your Aurora dashboard.
    `) +
    section('No Trading 212 account yet?', `
      You can open one at <a href="https://trading212.com" style="color:#70ebff;text-decoration:none;">trading212.com</a> &mdash; use the Aurora referral link from the Connections page and you will receive a free share when you make your first deposit.
    `) +
    nextStepBox('Look out for your onboarding emails over the next few days &mdash; we will walk you through each part of the platform step by step.'),
    { label: 'Connect Broker', url: `${APP}/dashboard/connections` }
  )
}

export function paymentFailedEmail(firstName: string): string {
  return wrap(
    'Payment Issue',
    'There was a problem with your payment.',
    'Your membership is still important to us, but your latest payment did not go through.',
    'Update Billing',
    `${APP}/dashboard/account`,
    firstName || 'there',
    section('What to do next', `
      Please update your payment method as soon as possible to avoid interruption to your access.<br><br>
      Once updated, your subscription will continue without issue.
    `) +
    textBlock('If you need help, reply to this email and our team will assist you.'),
    { label: 'Open Aurora', url: `${APP}/dashboard` }
  )
}

export function opportunityDetectedEmail(firstName: string, ticker: string): string {
  return wrap(
    'Opportunity Detected',
    `${ticker} matched your Aurora criteria.`,
    'A stock on your radar has matched an Aurora opportunity condition.',
    'View Opportunity',
    `${APP}/dashboard/stocks/${ticker}`,
    firstName || 'there',
    section('Signal Summary', `
      <strong>Ticker:</strong> ${ticker}<br>
      <strong>Status:</strong> Opportunity detected by Aurora scanning logic
    `) +
    section('Suggested next step', `
      Review the setup inside Aurora, check your entry plan, and decide whether it belongs on your active watchlist.
    `),
    { label: 'Open Dashboard', url: `${APP}/dashboard` }
  )
}

export function pullbackAlertEmail(firstName: string, ticker: string, level: string): string {
  return wrap(
    'Pullback Alert',
    `${ticker} reached your pullback zone.`,
    `Aurora has detected that ${ticker} has moved into your ${level} pullback level.`,
    'Check the Setup',
    `${APP}/dashboard/stocks/${ticker}`,
    firstName || 'there',
    section('Pullback Details', `
      <strong>Ticker:</strong> ${ticker}<br>
      <strong>Level:</strong> ${level} pullback<br><br>
      Review your ladder, entry size, and risk plan before taking action.
    `),
    { label: 'Open Calculator', url: `${APP}/dashboard/investments/calculator` }
  )
}

export function bepReachedEmail(firstName: string, ticker: string): string {
  return wrap(
    'BEP Reached',
    `${ticker} has reached break-even point.`,
    'One of your tracked positions has moved back to break-even.',
    'Review Position',
    `${APP}/dashboard/investments`,
    firstName || 'there',
    section('Position Update', `
      <strong>Ticker:</strong> ${ticker}<br>
      <strong>Status:</strong> Break-even reached<br><br>
      This may be a good time to review your next decision, target structure, and ongoing plan.
    `),
    { label: 'Open Dashboard', url: `${APP}/dashboard` }
  )
}

export function profitTargetEmail(firstName: string, ticker: string, target: string): string {
  return wrap(
    'Profit Target Hit',
    `${ticker} reached your profit target.`,
    `Aurora has detected that ${ticker} has reached your ${target} target level.`,
    'View Investment',
    `${APP}/dashboard/investments`,
    firstName || 'there',
    section('Target Update', `
      <strong>Ticker:</strong> ${ticker}<br>
      <strong>Target:</strong> ${target}<br><br>
      Review your position, your remaining targets, and your overall plan.
    `),
    { label: 'Open Dashboard', url: `${APP}/dashboard` }
  )
}

// Re-export for backward compat (welcome is in its own file)
export { section, textBlock, ctaBlock, nextStepBox, wrap as auroraEmailLayout }
