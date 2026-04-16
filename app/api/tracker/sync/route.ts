import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch positions from T212 via the existing broker/investments route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const mode = req.nextUrl.searchParams.get('mode') || 'live'

  let positions: any[] = []
  try {
    const res = await fetch(`${baseUrl}/api/broker/investments?mode=${mode}`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    if (!res.ok) throw new Error(`T212 API error: ${res.status}`)
    const data = await res.json()
    positions = data.positions || data.investments || []
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch T212 positions' }, { status: 502 })
  }

  if (!positions.length) {
    return NextResponse.json({ synced: 0, message: 'No open positions found in T212' })
  }

  let synced = 0
  let updated = 0
  const errors: string[] = []

  for (const pos of positions) {
    try {
      const ticker = (pos.symbol || '').toUpperCase()
      if (!ticker) continue

      const qty = parseFloat(pos.quantity || '0')
      const avg = parseFloat(pos.avg_price || '0')
      const cur = parseFloat(pos.current_price || '0')
      const ppl = parseFloat(pos.pnl || '0')
      const invested = parseFloat(pos.total_invested || '0') || (qty * avg)

      const record = {
        user_id: user.id,
        ticker,
        t212_ticker: pos.ticker_t212 || ticker,
        company_name: pos.company || ticker,
        bep_price: avg || null,
        num_shares: qty || null,
        current_price: cur || null,
        current_ppl: ppl || null,
        funds_invested: invested || null,
        date_entered: pos.first_invested_at
          ? new Date(pos.first_invested_at).toISOString().split('T')[0]
          : null,
        status: 'open' as const,
        synced_from_t212: true,
        updated_at: new Date().toISOString(),
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('investment_tracker')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .eq('status', 'open')
        .maybeSingle()

      if (existing) {
        await supabase
          .from('investment_tracker')
          .update({
            bep_price: record.bep_price,
            num_shares: record.num_shares,
            current_price: record.current_price,
            current_ppl: record.current_ppl,
            funds_invested: record.funds_invested,
            company_name: record.company_name,
            synced_from_t212: true,
            updated_at: record.updated_at,
          })
          .eq('id', existing.id)
        updated++
      } else {
        await supabase.from('investment_tracker').insert(record)
        synced++
      }
    } catch (err: any) {
      errors.push(`${pos.ticker}: ${err.message}`)
    }
  }

  return NextResponse.json({
    synced,
    updated,
    total: positions.length,
    errors: errors.length ? errors : undefined,
    message: `Imported ${synced} new positions, updated ${updated} existing`,
  })
}
