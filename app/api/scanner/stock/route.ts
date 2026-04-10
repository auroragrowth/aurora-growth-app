import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchFinvizTicker } from '@/lib/finviz/fetchers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.trim().toUpperCase()
  if (!ticker) {
    return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
  }

  // Get scanner data
  const { data: scanner } = await supabaseAdmin
    .from('scanner_results')
    .select('*')
    .eq('ticker', ticker)
    .limit(1)
    .maybeSingle()

  // Always fetch live data from Yahoo Finance
  let yahoo: any = {}
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuroraGrowth/1.0)' },
        next: { revalidate: 300 }
      }
    )
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    const meta = result?.meta
    const quotes = result?.indicators?.quote?.[0]
    const timestamps = result?.timestamp || []
    const highs = quotes?.high || []
    const volumes = quotes?.volume || []

    // 90d high and date
    let high90d = 0
    let high90dDate: string | null = null
    highs.forEach((h: number, i: number) => {
      if (h && h > high90d) {
        high90d = h
        high90dDate = timestamps[i]
          ? new Date(timestamps[i] * 1000).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric'
            })
          : null
      }
    })

    yahoo = {
      price: meta?.regularMarketPrice,
      previousClose: meta?.chartPreviousClose ?? meta?.previousClose,
      high52w: meta?.fiftyTwoWeekHigh,
      low52w: meta?.fiftyTwoWeekLow,
      marketCap: meta?.marketCap,
      volume: meta?.regularMarketVolume ?? (volumes.length ? volumes[volumes.length - 1] : null),
      currency: meta?.currency || 'USD',
      high90d: high90d || null,
      high90dDate,
      name: meta?.longName || meta?.shortName,
    }
  } catch (e) {
    console.error(`Yahoo error for ${ticker}:`, e)
  }

  // Fetch market cap + sector from Finviz (Yahoo chart endpoint doesn't include them)
  let finvizMarketCap: string | null = null
  let finvizSector: string | null = null
  try {
    const fv = await fetchFinvizTicker(ticker)
    finvizMarketCap = fv.marketCap || null
    finvizSector = fv.sector || null
  } catch {}

  // Use Yahoo data as primary, scanner as fallback
  const price = yahoo.price || parseFloat(scanner?.price || '0')
  const previousClose = yahoo.previousClose || null
  const high52w = yahoo.high52w || parseFloat(scanner?.high_52w || '0') || null
  const low52w = yahoo.low52w || null
  const high90d = yahoo.high90d || parseFloat(scanner?.high_90d || '0') || null

  // Change percent
  const changePct = previousClose && price
    ? ((price - previousClose) / previousClose) * 100
    : scanner?.change_percent ? parseFloat(scanner.change_percent) : null

  // Pct below 52w high
  const pctBelowHigh52w = high52w && price
    ? parseFloat((((high52w - price) / high52w) * 100).toFixed(1))
    : null

  // Market cap: Yahoo doesn't provide it in chart endpoint, use Finviz string
  const marketCapFormatted = finvizMarketCap || null

  // Score
  const score = parseInt(scanner?.score || scanner?.aurora_score || '0') || null

  // Peak data from scanner
  const mostRecentHatPrice = scanner?.most_recent_hat_price
    ? parseFloat(scanner.most_recent_hat_price)
    : null
  const mostRecentHatDate = scanner?.most_recent_hat_date || null
  const dropFromHatPct = scanner?.drop_from_hat_pct
    ? parseFloat(scanner.drop_from_hat_pct)
    : null
  const risesCount18m = scanner?.rises_count_18m
    ? parseInt(scanner.rises_count_18m)
    : null

  return NextResponse.json({
    ticker,
    company: yahoo.name || scanner?.company || scanner?.company_name || ticker,
    sector: finvizSector,
    price,
    previousClose,
    changePct,
    high52w,
    low52w,
    high90d,
    high90dDate: yahoo.high90dDate || scanner?.high_recent_20pct_date || null,
    recentHigh: high90d,
    recentHighDate: yahoo.high90dDate || scanner?.high_recent_20pct_date || null,
    marketCapFormatted,
    volume: yahoo.volume || null,
    currency: yahoo.currency || 'USD',
    pctBelowHigh52w,
    score,
    scannerType: scanner?.scanner_type || null,
    pe: scanner?.pe || null,
    roe: scanner?.roe || null,
    mostRecentHatPrice,
    mostRecentHatDate,
    dropFromHatPct,
    risesCount18m,
  })
}
