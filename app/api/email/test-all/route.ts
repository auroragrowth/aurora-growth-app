import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAuroraEmail } from '@/lib/email/resend'
import { welcomeEmail, subscriptionConfirmedEmail } from '@/lib/email/templates/aurora'
import { onboardingDay0Email } from '@/lib/email/templates/onboarding'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const to = user.email!
  const results = []

  const r1 = await sendAuroraEmail({
    to, subject: 'TEST: Aurora Welcome Email',
    html: welcomeEmail('Paul'),
  })
  results.push({ template: 'welcome', ...r1 })

  const r2 = await sendAuroraEmail({
    to, subject: 'TEST: Subscription Confirmed',
    html: subscriptionConfirmedEmail('Paul', 'Elite'),
  })
  results.push({ template: 'subscription_confirmed', ...r2 })

  const day0 = onboardingDay0Email('Paul')
  const r3 = await sendAuroraEmail({
    to, subject: `TEST: ${day0.subject}`,
    html: day0.html,
  })
  results.push({ template: 'onboarding_day0', ...r3 })

  return NextResponse.json({
    sent_to: to,
    results,
    success: results.every(r => r.success)
  })
}
