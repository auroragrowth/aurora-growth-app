// Aurora Peak Detection — finds 20%+ upward moves

export interface OHLCBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface DetectedPeak {
  peakDate: string
  peakPrice: number
  leftLowDate: string
  leftLowPrice: number
  risePercent: number
  isAllTimeHigh: boolean
}

export interface DetectedPullback {
  fromPeakDate: string
  fromPeakPrice: number
  troughDate: string
  troughPrice: number
  pullbackPercent: number
  isCovidPullback: boolean
}

// Find the true left-side low for a given peak
function findTrueLeftLow(
  bars: OHLCBar[],
  peakIndex: number
): { date: string; price: number; index: number } {
  let lowestPrice = bars[peakIndex].low
  let lowestIndex = peakIndex

  // Scan left from peak
  for (let i = peakIndex - 1; i >= 0; i--) {
    if (bars[i].low < lowestPrice) {
      lowestPrice = bars[i].low
      lowestIndex = i
    }
    // Stop if we find a bar that is a local peak
    // (price started going up significantly)
    if (i < peakIndex - 5 && bars[i].high > bars[peakIndex].high * 0.9) {
      break
    }
  }

  return {
    date: bars[lowestIndex].date,
    price: lowestPrice,
    index: lowestIndex,
  }
}

// Detect local highs
function findLocalHighs(bars: OHLCBar[], lookback = 5): number[] {
  const highs: number[] = []
  for (let i = lookback; i < bars.length - lookback; i++) {
    const currentHigh = bars[i].high
    let isHigh = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && bars[j].high > currentHigh) {
        isHigh = false
        break
      }
    }
    if (isHigh) highs.push(i)
  }
  return highs
}

export function detectAuroraPeaks(bars: OHLCBar[]): DetectedPeak[] {
  if (bars.length < 10) return []

  const allTimeHigh = Math.max(...bars.map(b => b.high))
  const localHighIndices = findLocalHighs(bars)
  const peaks: DetectedPeak[] = []
  let lastKeptPeakPrice = -Infinity

  // Scan right to left
  for (let i = localHighIndices.length - 1; i >= 0; i--) {
    const idx = localHighIndices[i]
    const peakPrice = bars[idx].high

    // Only keep if higher than last kept peak
    if (peakPrice <= lastKeptPeakPrice) continue

    const leftLow = findTrueLeftLow(bars, idx)
    const risePercent = ((peakPrice - leftLow.price) / leftLow.price) * 100

    if (risePercent >= 20) {
      peaks.unshift({
        peakDate: bars[idx].date,
        peakPrice,
        leftLowDate: leftLow.date,
        leftLowPrice: leftLow.price,
        risePercent: parseFloat(risePercent.toFixed(2)),
        isAllTimeHigh: peakPrice === allTimeHigh,
      })
      lastKeptPeakPrice = peakPrice
    }

    if (peakPrice === allTimeHigh) break
  }

  return peaks
}

export function detectPullbacks(
  bars: OHLCBar[],
  peaks: DetectedPeak[]
): DetectedPullback[] {
  const pullbacks: DetectedPullback[] = []

  for (let i = 0; i < peaks.length - 1; i++) {
    const currentPeak = peaks[i]
    const nextPeak = peaks[i + 1]

    const peakIdx = bars.findIndex(b => b.date === currentPeak.peakDate)
    const nextPeakIdx = bars.findIndex(b => b.date === nextPeak.peakDate)

    if (peakIdx === -1 || nextPeakIdx === -1) continue

    const barsInRange = bars.slice(peakIdx, nextPeakIdx)
    const troughBar = barsInRange.reduce((min, b) =>
      b.low < min.low ? b : min
    )

    const pullbackPercent = ((currentPeak.peakPrice - troughBar.low) /
      currentPeak.peakPrice) * 100

    // Check if COVID pullback (trough around March 2020)
    const isCovidPullback = troughBar.date >= '2020-02-01' &&
      troughBar.date <= '2020-04-30'

    pullbacks.push({
      fromPeakDate: currentPeak.peakDate,
      fromPeakPrice: currentPeak.peakPrice,
      troughDate: troughBar.date,
      troughPrice: troughBar.low,
      pullbackPercent: parseFloat(pullbackPercent.toFixed(2)),
      isCovidPullback,
    })
  }

  return pullbacks
}

export function getLargestPullback(pullbacks: DetectedPullback[]): number {
  if (pullbacks.length === 0) return 30 // default minimum
  return Math.max(...pullbacks.map(p => p.pullbackPercent))
}
