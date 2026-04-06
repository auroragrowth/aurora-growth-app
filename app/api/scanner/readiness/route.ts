import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  if (!ticker) return NextResponse.json({ error: 'No ticker' }, { status: 400 })

  const admin = getAdmin()

  try {
    // Get live price from Yahoo Finance
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } }
    )
    const json = await res.json()
    const livePrice = json?.chart?.result?.[0]?.meta?.regularMarketPrice

    // Get peaks from DB
    const cutoff = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { data: peaks } = await admin
      .from('stock_peaks')
      .select('peak_date, peak_price, rise_percent')
      .eq('ticker', ticker)
      .gte('rise_percent', 20)
      .gte('peak_date', cutoff)
      .order('peak_date', { ascending: false })

    const risesCount = peaks?.length || 0
    const latestHat = peaks?.[0]?.peak_price || null
    const currentPrice = livePrice || 0

    const dropPct = latestHat && currentPrice > 0
      ? Math.round(((latestHat - currentPrice) / latestHat * 100) * 10) / 10
      : null

    let readiness = 'grey'
    if (risesCount >= 3 && dropPct !== null) {
      if (dropPct >= 20) readiness = 'green'
      else if (dropPct >= 10) readiness = 'amber'
      else readiness = 'red'
    }

    // Update DB with latest calculation
    await admin.from('scanner_results').update({
      rises_count_18m: risesCount,
      most_recent_hat_price: latestHat,
      drop_from_hat_pct: dropPct,
      readiness,
      price: currentPrice.toString()
    }).eq('ticker', ticker)

    return NextResponse.json({
      ticker,
      livePrice: currentPrice,
      latestHat,
      dropPct,
      risesCount,
      readiness
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
