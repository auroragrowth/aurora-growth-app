import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDayNumber, getEmailForUser, sendOnboardingDay } from '@/lib/email/onboarding'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at, subscription_status')
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!profiles?.length) {
    return NextResponse.json({ message: 'No users found', sent: 0 })
  }

  const results = []
  for (const profile of profiles) {
    const dayNumber = getDayNumber(profile.created_at)
    if (dayNumber < 0 || dayNumber > 7) continue

    const email = await getEmailForUser(profile.id, profile.email)
    if (!email) continue

    const firstName = profile.full_name?.split(' ')[0] || 'there'
    const sent = await sendOnboardingDay(
      profile.id, dayNumber, firstName, email
    )
    if (sent) results.push({ email, dayNumber })
  }

  return NextResponse.json({
    message: 'Onboarding cron complete',
    sent: results.length,
    results
  })
}
