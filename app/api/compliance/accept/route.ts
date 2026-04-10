import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TERMS_VERSION = 'v1.0-2026-04-10'
const RISK_VERSION = 'v1.0-2026-04-10'
const PRIVACY_VERSION = 'v1.0-2026-04-10'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(
      { error: 'Not authenticated' }, { status: 401 }
    )

    const body = await req.json()
    const { full_name } = body

    const ip = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const acceptedAt = new Date().toISOString()

    // Save compliance record
    const { data: record, error } = await admin
      .from('compliance_acceptances')
      .insert({
        user_id: user.id,
        email: user.email,
        full_name: full_name || null,
        accepted_at: acceptedAt,
        ip_address: ip.split(',')[0].trim(),
        user_agent: userAgent.slice(0, 500),
        terms_version: TERMS_VERSION,
        risk_warning_version: RISK_VERSION,
        privacy_version: PRIVACY_VERSION,
        acceptance_method: 'checkbox_form',
        email_sent: false,
      })
      .select()
      .single()

    if (error) throw error

    // Update profile
    await admin
      .from('profiles')
      .update({
        compliance_accepted: true,
        compliance_accepted_at: acceptedAt,
        compliance_version: TERMS_VERSION,
      })
      .eq('id', user.id)

    // Send confirmation email via Resend
    try {
      const formattedDate = new Date(acceptedAt).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })

      const emailHtml = `
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aurora Growth Academy</title></head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#eaf4ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#020617 0%,#04101f 35%,#020617 100%);">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:rgba(8,20,42,0.92);border:1px solid rgba(83,175,255,0.18);border-radius:24px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="padding:28px 32px 20px 32px;background:radial-gradient(circle at top left,rgba(36,215,238,0.18),transparent 30%),radial-gradient(circle at top right,rgba(139,92,246,0.18),transparent 30%),linear-gradient(180deg,#071123 0%,#04101f 100%);border-bottom:1px solid rgba(83,175,255,0.18);">
    <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/AGA_Logo.png" alt="Aurora Growth Academy" style="height:48px;width:auto;display:block;margin-bottom:16px;">
    <div style="display:inline-block;padding:7px 12px;border-radius:999px;border:1px solid rgba(36,215,238,0.24);background:rgba(8,16,35,0.8);color:#70ebff;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:14px;">
      Terms &amp; Risk Acceptance
    </div>
    <h1 style="margin:0;font-size:26px;line-height:1.15;color:#ffffff;">Your agreement has been recorded</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 32px;">
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#a9bfd8;">
      Dear ${full_name || user.email},
    </p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#a9bfd8;">
      This email confirms that you have accepted the Aurora Growth Academy Terms of Service,
      Risk Warning, and Privacy Policy. Please keep this email for your records.
    </p>

    <!-- Acceptance record card -->
    <div style="background:linear-gradient(180deg,rgba(8,20,42,0.95),rgba(5,12,24,0.94));border:1px solid rgba(83,175,255,0.16);border-radius:16px;padding:20px;margin-bottom:20px;">
      <div style="color:#70ebff;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:14px;">
        \u2713 Acceptance Record
      </div>
      <table style="width:100%;font-size:13px;color:#a9bfd8;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#6b8aad;width:160px;">Date &amp; Time</td>
          <td style="padding:5px 0;color:#eaf4ff;font-weight:bold;">${formattedDate} (London)</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Account Email</td>
          <td style="padding:5px 0;color:#eaf4ff;">${user.email}</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Full Name</td>
          <td style="padding:5px 0;color:#eaf4ff;">${full_name || 'Not provided'}</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Terms Version</td>
          <td style="padding:5px 0;">${TERMS_VERSION}</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Risk Warning</td>
          <td style="padding:5px 0;">${RISK_VERSION}</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Privacy Policy</td>
          <td style="padding:5px 0;">${PRIVACY_VERSION}</td></tr>
        <tr><td style="padding:5px 0;color:#6b8aad;">Record ID</td>
          <td style="padding:5px 0;font-family:monospace;font-size:11px;">${record.id}</td></tr>
      </table>
    </div>

    <!-- Documents agreed -->
    <div style="color:#70ebff;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px;">
      Documents Agreed
    </div>
    <div style="margin-bottom:20px;font-size:14px;line-height:2.2;color:#eaf4ff;">
      \u2713 <a href="https://app.auroragrowth.co.uk/terms" style="color:#70ebff;">Terms of Service</a><br>
      \u2713 <a href="https://app.auroragrowth.co.uk/risk-warning" style="color:#70ebff;">Risk Warning</a><br>
      \u2713 <a href="https://app.auroragrowth.co.uk/privacy" style="color:#70ebff;">Privacy Policy</a>
    </div>

    <!-- Risk warning -->
    <div style="background:rgba(251,146,60,0.08);border:1px solid rgba(251,146,60,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="color:#fbbf24;font-size:13px;margin:0;line-height:1.6;">
        <strong>\u26A0 Capital at risk.</strong> The value of investments can go down as well as up.
        Aurora Growth Academy provides educational tools only and does not constitute financial advice.
        Past performance is not a reliable indicator of future results.
      </p>
    </div>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b8aad;">
      If you did not accept these terms or believe this email was sent in error,
      contact us at <a href="mailto:info@auroragrowth.co.uk" style="color:#70ebff;">info@auroragrowth.co.uk</a>.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;text-align:center;font-size:12px;line-height:1.8;color:#6b8aad;border-top:1px solid rgba(83,175,255,0.12);">
    Aurora Growth Academy \u00B7 Educational Investment Tools<br>
    This is an automated compliance record. Please retain for your records.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Aurora Growth Academy <onboarding@auroragrowth.co.uk>',
          to: [user.email!],
          subject: 'Aurora Growth Academy \u2014 Terms & Risk Acceptance Confirmation',
          html: emailHtml,
        }),
      })

      // Mark email as sent
      await admin
        .from('compliance_acceptances')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', record.id)

    } catch (emailErr) {
      console.error('[Compliance] Email error:', emailErr)
      // Don't fail the request — record is saved
    }

    // Admin notification
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (token) {
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '7881047668',
            text: `\u2705 *Compliance Accepted*\n\n${user.email}\n${full_name ? `Name: ${full_name}\n` : ''}Accepted: ${new Date(acceptedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}\nRecord: \`${record.id}\``,
            parse_mode: 'Markdown'
          })
        }
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      record_id: record.id,
      accepted_at: acceptedAt,
    })
  } catch (e: any) {
    console.error('[Compliance accept]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
