import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendAuroraEmail({
  to,
  subject,
  html,
  from = 'Aurora Growth Academy <onboarding@auroragrowth.co.uk>'
}: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error }
    }
    console.log('[Email] Sent:', data?.id, 'to:', to)
    return { success: true, id: data?.id }
  } catch (e: any) {
    console.error('[Email] Exception:', e.message)
    return { success: false, error: e.message }
  }
}
