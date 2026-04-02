import type { OHLCBar } from './peakDetection'

export async function fetchOHLC(
  ticker: string,
  years = 5
): Promise<OHLCBar[]> {
  const range = `${years}y`
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // cache 1 hour
  })

  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error('No data from Yahoo Finance')

  const timestamps: number[] = result.timestamp || []
  const quotes = result.indicators?.quote?.[0]
  const opens: number[] = quotes?.open || []
  const highs: number[] = quotes?.high || []
  const lows: number[] = quotes?.low || []
  const closes: number[] = quotes?.close || []
  const volumes: number[] = quotes?.volume || []

  const bars: OHLCBar[] = []
  for (let i = 0; i < timestamps.length; i++) {
    if (!highs[i] || !lows[i] || !closes[i]) continue
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i],
    })
  }

  return bars
}
