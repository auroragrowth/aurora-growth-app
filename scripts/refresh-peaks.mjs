import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, '..', '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

async function fetchPriceHistory(ticker) {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = Math.floor((Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) / 1000)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${from}&period2=${to}`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const highs = result.indicators?.quote?.[0]?.high || []
    return timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      close: closes[i],
      high: highs[i]
    })).filter(d => d.close != null)
  } catch {
    return null
  }
}

function detectPeaks(prices) {
  const peaks = []
  if (!prices || prices.length < 10) return peaks

  let low = prices[0].close
  let lowDate = prices[0].date
  let riseStart = low
  let riseStartDate = lowDate
  let inRise = false

  for (let i = 1; i < prices.length; i++) {
    const price = prices[i].close
    const date = prices[i].date

    if (price < low) {
      low = price
      lowDate = date
      riseStart = price
      riseStartDate = date
      inRise = false
    } else {
      const riseFromLow = ((price - riseStart) / riseStart) * 100
      if (riseFromLow >= 20) inRise = true

      if (inRise && i < prices.length - 3) {
        const next3 = prices.slice(i + 1, i + 4).map(p => p.close)
        const isLocalPeak = next3.filter(n => n < price).length >= 2
        if (isLocalPeak && riseFromLow >= 20) {
          peaks.push({
            peak_date: date,
            peak_price: price,
            left_low_date: riseStartDate,
            left_low_price: riseStart,
            rise_percent: Math.round(riseFromLow * 100) / 100,
            is_all_time_high: false
          })
          low = price
          lowDate = date
          riseStart = price
          riseStartDate = date
          inRise = false
        }
      }
    }
  }

  const last = prices[prices.length - 1]
  const finalRise = ((last.close - riseStart) / riseStart) * 100
  if (inRise && finalRise >= 20) {
    peaks.push({
      peak_date: last.date,
      peak_price: last.close,
      left_low_date: riseStartDate,
      left_low_price: riseStart,
      rise_percent: Math.round(finalRise * 100) / 100,
      is_all_time_high: false
    })
  }

  return peaks
}

function calculateReadiness(peaks, currentPrice) {
  if (!peaks || peaks.length === 0 || !currentPrice) {
    return { readiness: 'grey', rises_count_18m: 0, most_recent_hat_price: null, most_recent_hat_date: null, drop_from_hat_pct: null }
  }

  const risesCount = peaks.length
  const latestPeak = peaks.sort((a, b) =>
    new Date(b.peak_date) - new Date(a.peak_date))[0]

  const hatPrice = latestPeak.peak_price
  const dropPct = hatPrice > 0
    ? Math.round(((hatPrice - currentPrice) / hatPrice * 100) * 10) / 10
    : null

  let readiness = 'grey'
  if (risesCount >= 3 && dropPct !== null) {
    if (dropPct >= 20) readiness = 'green'
    else if (dropPct >= 10) readiness = 'amber'
    else readiness = 'red'
  }

  return { readiness, rises_count_18m: risesCount, most_recent_hat_price: hatPrice, most_recent_hat_date: latestPeak.peak_date, drop_from_hat_pct: dropPct }
}

async function run() {
  console.log('[Peaks] Starting peak detection for all scanner stocks...')

  const { data: stocks } = await supabase
    .from('scanner_results')
    .select('ticker, price')

  if (!stocks?.length) {
    console.error('[Peaks] No scanner stocks found')
    process.exit(1)
  }

  console.log(`[Peaks] Processing ${stocks.length} stocks...`)

  let processed = 0
  let failed = 0

  for (const stock of stocks) {
    try {
      const ticker = stock.ticker
      const currentPrice = parseFloat(stock.price || '0')

      const prices = await fetchPriceHistory(ticker)
      if (!prices || prices.length < 20) {
        console.log(`[Peaks] ${ticker}: No price data — skipping`)
        failed++
        await supabase.from('scanner_results').update({
          rises_count_18m: 0, most_recent_hat_price: null,
          drop_from_hat_pct: null, readiness: 'grey'
        }).eq('ticker', ticker)
        continue
      }

      const peaks = detectPeaks(prices)
      console.log(`[Peaks] ${ticker}: ${peaks.length} peaks from ${prices.length} days`)

      await supabase.from('stock_peaks').delete().eq('ticker', ticker)
      if (peaks.length > 0) {
        await supabase.from('stock_peaks').insert(peaks.map(p => ({ ticker, ...p })))
      }

      await supabase.from('price_history').delete().eq('ticker', ticker)
      for (let i = 0; i < prices.length; i += 100) {
        const batch = prices.slice(i, i + 100).map(p => ({
          ticker, date: p.date, close: p.close, high: p.high
        }))
        await supabase.from('price_history').insert(batch)
      }

      const readinessData = calculateReadiness(peaks, currentPrice)
      await supabase.from('scanner_results').update(readinessData).eq('ticker', ticker)

      processed++
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error(`[Peaks] Error for ${stock.ticker}:`, e.message)
      failed++
    }
  }

  console.log(`[Peaks] Done — ${processed} processed, ${failed} failed`)

  const { data: summary } = await supabase.from('scanner_results').select('readiness')
  const counts = { green: 0, amber: 0, red: 0, grey: 0 }
  summary?.forEach(s => counts[s.readiness || 'grey']++)
  console.log('[Peaks] Readiness summary:', counts)
}

run()
