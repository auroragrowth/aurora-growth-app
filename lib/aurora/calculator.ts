// Aurora Investment Method — Core Calculation Engine

export type LadderType = 30 | 40 | 50 | 60 | 70 | 90

export interface Peak {
  peakDate: string
  peakPrice: number
  leftLowDate: string
  leftLowPrice: number
  risePercent: number
  isAllTimeHigh?: boolean
}

export interface Pullback {
  fromPeakDate: string
  fromPeakPrice: number
  troughDate: string
  troughPrice: number
  pullbackPercent: number
  isCovidPullback?: boolean
}

export interface EntryLine {
  step: number
  dropPercent: number
  entryPrice: number
  allocation: number
  plannedShares: number
  isFilled: boolean
  isCombinedBuy?: boolean
  combinedLines?: number[]
}

export interface Fill {
  date: string
  price: number
  shares: number
  allocationUsed: number
  isCombinedBuy?: boolean
  linesCombined?: number[]
}

export interface AuroraLadderResult {
  ticker: string
  recentPeakPrice: number
  recentPeakDate: string
  currentPrice: number
  largestPullback: number
  calculatorType: LadderType
  ladderDrops: number[]
  entryLines: EntryLine[]
  fills: Fill[]
  bep: number | null
  profitLevels: {
    p10: number
    p15: number
    p20: number
    p25: number
    p30: number
  } | null
  stopLoss: number | null
  combinedBuyNeeded: boolean
  combinedBuyLines: number[]
  combinedBuyAllocation: number
  combinedBuyShares: number
  pendingLines: EntryLine[]
}

// LADDER STRUCTURES - from spec
const LADDER_DROPS: Record<LadderType, number[]> = {
  30: [10, 20, 30],
  40: [10, 20, 30, 40],
  50: [20, 30, 40, 50],
  60: [30, 40, 50, 60],
  70: [20, 30, 40, 50, 60, 70],
  90: [30, 40, 50, 60, 70, 90],
}

// CALCULATOR SELECTION from spec
export function chooseCalculator(largestPullback: number): LadderType {
  if (largestPullback <= 30) return 30
  if (largestPullback <= 40) return 40
  if (largestPullback <= 50) return 50
  if (largestPullback <= 60) return 60
  if (largestPullback <= 70) return 70
  return 90
}

// SCALED ALLOCATION - 1.25x increasing weights
export function calculateAllocations(
  totalCapital: number,
  numLines: number
): number[] {
  const weights = Array.from({ length: numLines }, (_, i) =>
    Math.pow(1.25, i)
  )
  const weightSum = weights.reduce((a, b) => a + b, 0)
  return weights.map(w => (totalCapital * w) / weightSum)
}

// ENTRY LINES from recent peak
export function generateEntryLines(
  recentPeakPrice: number,
  totalCapital: number,
  ladderType: LadderType
): EntryLine[] {
  const drops = LADDER_DROPS[ladderType]
  const allocations = calculateAllocations(totalCapital, drops.length)

  return drops.map((dropPercent, i) => {
    const entryPrice = recentPeakPrice * (1 - dropPercent / 100)
    const allocation = allocations[i]
    const plannedShares = allocation / entryPrice
    return {
      step: i + 1,
      dropPercent,
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      allocation: parseFloat(allocation.toFixed(2)),
      plannedShares: parseFloat(plannedShares.toFixed(4)),
      isFilled: false,
    }
  })
}

// COMBINED BUY LOGIC
// If current price is already below multiple entry lines,
// combine those allocations and buy at live price
export function calculateCombinedBuy(
  entryLines: EntryLine[],
  currentPrice: number
): {
  needed: boolean
  crossedLines: number[]
  combinedAllocation: number
  sharesToBuy: number
} {
  const crossedLines = entryLines.filter(
    line => currentPrice <= line.entryPrice && !line.isFilled
  )

  if (crossedLines.length === 0) {
    return { needed: false, crossedLines: [], combinedAllocation: 0, sharesToBuy: 0 }
  }

  const combinedAllocation = crossedLines.reduce(
    (sum, line) => sum + line.allocation, 0
  )
  const sharesToBuy = combinedAllocation / currentPrice

  return {
    needed: true,
    crossedLines: crossedLines.map(l => l.step),
    combinedAllocation: parseFloat(combinedAllocation.toFixed(2)),
    sharesToBuy: parseFloat(sharesToBuy.toFixed(4)),
  }
}

// BEP CALCULATION
export function calculateBEP(fills: Fill[]): number | null {
  if (fills.length === 0) return null
  const totalCost = fills.reduce((sum, f) => sum + f.shares * f.price, 0)
  const totalShares = fills.reduce((sum, f) => sum + f.shares, 0)
  return parseFloat((totalCost / totalShares).toFixed(2))
}

// PROFIT LEVELS from BEP
export function calculateProfitLevels(bep: number) {
  return {
    p10: parseFloat((bep * 1.10).toFixed(2)),
    p15: parseFloat((bep * 1.15).toFixed(2)),
    p20: parseFloat((bep * 1.20).toFixed(2)),
    p25: parseFloat((bep * 1.25).toFixed(2)),
    p30: parseFloat((bep * 1.30).toFixed(2)),
  }
}

// STOP LOSS from current price vs BEP levels
export function calculateStopLoss(
  currentPrice: number,
  bep: number
): number | null {
  const levels = calculateProfitLevels(bep)
  if (currentPrice >= levels.p25) return parseFloat((levels.p20).toFixed(2))
  if (currentPrice >= levels.p20) return parseFloat((levels.p15).toFixed(2))
  if (currentPrice >= levels.p15) return parseFloat((levels.p10).toFixed(2))
  if (currentPrice >= levels.p10) return parseFloat((bep * 1.001).toFixed(2))
  return null
}

// MAIN CALCULATOR FUNCTION
export function runAuroraCalculator(params: {
  ticker: string
  recentPeakPrice: number
  recentPeakDate: string
  currentPrice: number
  largestPullback: number
  totalCapital: number
  existingFills?: Fill[]
}): AuroraLadderResult {
  const {
    ticker,
    recentPeakPrice,
    recentPeakDate,
    currentPrice,
    largestPullback,
    totalCapital,
    existingFills = [],
  } = params

  const calculatorType = chooseCalculator(largestPullback)
  const ladderDrops = LADDER_DROPS[calculatorType]
  const entryLines = generateEntryLines(recentPeakPrice, totalCapital, calculatorType)

  // Mark filled lines from existing fills
  const filledSteps = new Set(existingFills.map(f => f.linesCombined || []).flat())
  entryLines.forEach(line => {
    if (filledSteps.has(line.step)) line.isFilled = true
  })

  const combinedBuy = calculateCombinedBuy(
    entryLines.filter(l => !l.isFilled),
    currentPrice
  )

  const allFills = [...existingFills]

  // If combined buy is needed, simulate it
  if (combinedBuy.needed && existingFills.length === 0) {
    allFills.push({
      date: new Date().toISOString().split('T')[0],
      price: currentPrice,
      shares: combinedBuy.sharesToBuy,
      allocationUsed: combinedBuy.combinedAllocation,
      isCombinedBuy: true,
      linesCombined: combinedBuy.crossedLines,
    })
    combinedBuy.crossedLines.forEach(step => {
      const line = entryLines.find(l => l.step === step)
      if (line) line.isFilled = true
    })
  }

  const bep = calculateBEP(allFills)
  const profitLevels = bep ? calculateProfitLevels(bep) : null
  const stopLoss = bep ? calculateStopLoss(currentPrice, bep) : null

  const pendingLines = entryLines.filter(l => !l.isFilled)

  return {
    ticker,
    recentPeakPrice,
    recentPeakDate,
    currentPrice,
    largestPullback,
    calculatorType,
    ladderDrops,
    entryLines,
    fills: allFills,
    bep,
    profitLevels,
    stopLoss,
    combinedBuyNeeded: combinedBuy.needed && existingFills.length === 0,
    combinedBuyLines: combinedBuy.crossedLines,
    combinedBuyAllocation: combinedBuy.combinedAllocation,
    combinedBuyShares: combinedBuy.sharesToBuy,
    pendingLines,
  }
}
