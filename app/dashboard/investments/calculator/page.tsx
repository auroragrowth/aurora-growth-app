import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import CalculatorClient from './CalculatorClient'

async function getWatchlistData() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { stocks: [], mode: 'live' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_broker_mode')
      .eq('id', user.id)
      .single()

    const mode = profile?.active_broker_mode || 'live'
    const table = mode === 'demo' ? 'watchlist_demo' : 'watchlist_live'

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: stocks } = await admin
      .from(table)
      .select('symbol, company_name, source')
      .eq('user_id', user.id)
      .order('symbol', { ascending: true })

    return { stocks: stocks || [], mode }
  } catch (e) {
    console.error('Calculator watchlist error:', e)
    return { stocks: [], mode: 'live' }
  }
}

export default async function CalculatorPage() {
  const { stocks, mode } = await getWatchlistData()
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CalculatorClient initialStocks={stocks} initialMode={mode} />
    </Suspense>
  )
}
