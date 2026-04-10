import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin || user.email !== 'paulrudland@me.com') return NextResponse.json([], { status: 403 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data } = await admin
      .from('profiles')
      .select('id, email, full_name, plan_key, plan, subscription_status, compliance_accepted, compliance_accepted_at, compliance_version, created_at')
      .order('created_at', { ascending: false })

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
