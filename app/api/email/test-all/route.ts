import { NextRequest, NextResponse } from 'next/server'
import { sendAuroraEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/welcome'
import {
  subscriptionConfirmedEmail,
  paymentFailedEmail,
  opportunityDetectedEmail,
  pullbackAlertEmail,
  bepReachedEmail,
  profitTargetEmail,
} from '@/lib/email/templates/aurora'
import { getOnboardingEmail } from '@/lib/email/templates/onboarding'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth via query param secret or cron secret
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized — add ?secret=YOUR_CRON_SECRET' }, { status: 401 })
  }

  const to = req.nextUrl.searchParams.get('to') || 'paulrudland@me.com'
  const firstName = 'Paul'
  const results: any[] = []

  // Aurora system emails
  const systemEmails = [
    { name: 'welcome', subject: 'TEST 1/15: Welcome Email', html: welcomeEmail(firstName) },
    { name: 'subscription_confirmed', subject: 'TEST 2/15: Subscription Confirmed', html: subscriptionConfirmedEmail(firstName, 'Elite') },
    { name: 'payment_failed', subject: 'TEST 3/15: Payment Failed', html: paymentFailedEmail(firstName) },
    { name: 'opportunity_detected', subject: 'TEST 4/15: Opportunity Detected (NVDA)', html: opportunityDetectedEmail(firstName, 'NVDA') },
    { name: 'pullback_alert', subject: 'TEST 5/15: Pullback Alert (AAPL -30%)', html: pullbackAlertEmail(firstName, 'AAPL', '-30%') },
    { name: 'bep_reached', subject: 'TEST 6/15: BEP Reached (MSFT)', html: bepReachedEmail(firstName, 'MSFT') },
    { name: 'profit_target', subject: 'TEST 7/15: Profit Target Hit (AMZN +15%)', html: profitTargetEmail(firstName, 'AMZN', '+15%') },
  ]

  for (const email of systemEmails) {
    const r = await sendAuroraEmail({ to, subject: email.subject, html: email.html })
    results.push({ template: email.name, success: r.success, id: r.id })
  }

  // Onboarding Day 0-7
  for (let day = 0; day <= 7; day++) {
    const template = getOnboardingEmail(day, firstName)
    if (!template) continue
    const r = await sendAuroraEmail({
      to,
      subject: `TEST ${8 + day}/15: Day ${day} — ${template.subject}`,
      html: template.html,
    })
    results.push({ template: `onboarding_day${day}`, success: r.success, id: r.id })
  }

  const successCount = results.filter(r => r.success).length

  return NextResponse.json({
    sent_to: to,
    total: results.length,
    success: successCount,
    failed: results.length - successCount,
    results,
  })
}
