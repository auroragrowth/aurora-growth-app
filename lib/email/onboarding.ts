import { createClient } from '@supabase/supabase-js'
import { sendAuroraEmail } from './resend'
import { getOnboardingEmail } from './templates/onboarding'
import { getAuroraMarketingHtml } from './aurora-email-selfcontained'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function getDayNumber(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diff = now.getTime() - created.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export async function getEmailForUser(
  userId: string,
  profileEmail?: string
): Promise<string | null> {
  if (profileEmail) return profileEmail
  const admin = getAdmin()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email || null
}

export async function hasOnboardingBeenSent(
  userId: string,
  dayNumber: number
): Promise<boolean> {
  const admin = getAdmin()
  const { data } = await admin
    .from('user_onboarding_emails')
    .select('id')
    .eq('user_id', userId)
    .eq('day_number', dayNumber)
    .single()
  return !!data
}

export async function markOnboardingSent(
  userId: string,
  email: string,
  dayNumber: number,
  subject: string
) {
  const admin = getAdmin()
  await admin.from('user_onboarding_emails').upsert({
    user_id: userId,
    email,
    day_number: dayNumber,
    subject,
    status: 'sent',
    sent_at: new Date().toISOString()
  }, { onConflict: 'user_id,day_number' })
}

export async function sendOnboardingDay(
  userId: string,
  dayNumber: number,
  firstName: string,
  email: string
): Promise<boolean> {
  if (dayNumber < 0 || dayNumber > 7) return false

  const alreadySent = await hasOnboardingBeenSent(userId, dayNumber)
  if (alreadySent) return false

  // Day 0 uses the new branded marketing email
  const template = dayNumber === 0
    ? {
        subject: 'Invest with clarity, not guesswork — Aurora Growth Academy',
        html: getAuroraMarketingHtml(firstName),
      }
    : getOnboardingEmail(dayNumber, firstName)

  if (!template) return false

  const result = await sendAuroraEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })

  if (result.success) {
    await markOnboardingSent(userId, email, dayNumber, template.subject)
  }

  return result.success
}

