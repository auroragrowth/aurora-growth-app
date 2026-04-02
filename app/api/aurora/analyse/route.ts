import { NextRequest, NextResponse } from 'next/server'
import { fetchOHLC } from '@/lib/aurora/fetchOHLC'
import {
  detectAuroraPeaks,
  detectPullbacks,
  getLargestPullback,
} from '@/lib/aurora/peakDetection'
import {
  runAuroraCalculator,
  chooseCalculator,
} from '@/lib/aurora/calculator'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  const capital = parseFloat(req.nextUrl.searchParams.get('capital') || '1000')

  if (!ticker) return NextResponse.json(
    { error: 'Ticker required' }, { status: 400 }
  )

  try {
    const supabase = admin()

    // Check cache first
    const { data: cached } = await supabase
      .from('ladder_analysis')
      .select('*')
      .eq('ticker', ticker)
      .single()

    const cacheAge = cached?.last_analysed_at
      ? (Date.now() - new Date(cached.last_analysed_at).getTime()) / 3600000
      : 999

    let largestPullback: number
    let recentPeakPrice: number
    let recentPeakDate: string
    let peaks: any[] = []
    let pullbacks: any[] = []

    if (cached && cacheAge < 24) {
      // Use cached analysis
      largestPullback = cached.largest_pullback
      recentPeakPrice = cached.recent_peak_price
      recentPeakDate = cached.recent_peak_date
    } else {
      // Fetch and analyse
      const bars = await fetchOHLC(ticker, 5)
      if (bars.length < 20) {
        return NextResponse.json({ error: 'Insufficient price history' }, { status: 400 })
      }

      peaks = detectAuroraPeaks(bars)
      pullbacks = detectPullbacks(bars, peaks)
      largestPullback = getLargestPullback(pullbacks)

      // Most recent peak
      const latestPeak = peaks[peaks.length - 1]
      recentPeakPrice = latestPeak?.peakPrice || bars[bars.length - 1].high
      recentPeakDate = latestPeak?.peakDate || bars[bars.length - 1].date

      // Cache the analysis
      await supabase.from('ladder_analysis').upsert({
        ticker,
        largest_pullback: largestPullback,
        calculator_type: chooseCalculator(largestPullback),
        recent_peak_price: recentPeakPrice,
        recent_peak_date: recentPeakDate,
        ladder_drops: [],
        last_analysed_at: new Date().toISOString(),
      }, { onConflict: 'ticker' })

      // Save peaks
      if (peaks.length > 0) {
        await supabase.from('stock_peaks').delete().eq('ticker', ticker)
        await supabase.from('stock_peaks').insert(
          peaks.map(p => ({
            ticker,
            peak_date: p.peakDate,
            peak_price: p.peakPrice,
            left_low_date: p.leftLowDate,
            left_low_price: p.leftLowPrice,
            rise_percent: p.risePercent,
            is_all_time_high: p.isAllTimeHigh,
          }))
        )
      }

      // Save pullbacks
      if (pullbacks.length > 0) {
        await supabase.from('stock_pullbacks').delete().eq('ticker', ticker)
        await supabase.from('stock_pullbacks').insert(
          pullbacks.map(p => ({
            ticker,
            from_peak_date: p.fromPeakDate,
            from_peak_price: p.fromPeakPrice,
            trough_date: p.troughDate,
            trough_price: p.troughPrice,
            pullback_percent: p.pullbackPercent,
            is_covid_pullback: p.isCovidPullback,
          }))
        )
      }
    }

    // Fetch live price from Yahoo
    const quoteRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const quoteData = await quoteRes.json()
    const currentPrice = quoteData?.chart?.result?.[0]?.meta?.regularMarketPrice || 0

    const result = runAuroraCalculator({
      ticker,
      recentPeakPrice,
      recentPeakDate,
      currentPrice,
      largestPullback,
      totalCapital: capital,
    })

    return NextResponse.json({
      ...result,
      peaks,
      pullbacks,
      analysisAge: cacheAge < 24 ? 'cached' : 'fresh',
    })

  } catch (e: any) {
    console.error('Aurora analyse error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
