import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAuroraEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates/aurora'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(
      { error: 'Not authenticated' }, { status: 401 }
    )

    const { email, firstName } = await req.json()
    if (!email || !firstName) return NextResponse.json(
      { error: 'Email and firstName required' }, { status: 400 }
    )

    const html = welcomeEmail(firstName)
    const result = await sendAuroraEmail({
      to: email,
      subject: `Welcome to Aurora Growth Academy, ${firstName}`,
      html,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Welcome email sent to ${email}`,
      id: result.id
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
