import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ mode: 'live' })

    const { data } = await supabase
      .from('profiles')
      .select('active_broker_mode')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      mode: data?.active_broker_mode || 'live'
    })
  } catch {
    return NextResponse.json({ mode: 'live' })
  }
}
