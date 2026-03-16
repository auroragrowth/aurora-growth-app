import type {
  LadderCalculationInput,
  LadderCalculationResult,
  LadderProfile,
  LadderStep,
} from "@/types/investments"

const PROFILE_LEVELS: Record<LadderProfile, number[]> = {
  30: [-0.1, -0.2, -0.3],
  40: [-0.1, -0.2, -0.3, -0.4],
  50: [-0.2, -0.3, -0.4, -0.5],
  60: [-0.3, -0.4, -0.5, -0.6],
  70: [-0.2, -0.3, -0.4, -0.5, -0.6, -0.7],
}

function round(value: number, dp = 2) {
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}

function roundShares(value: number, dp = 4) {
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}

export function getProfileLevels(profile: LadderProfile): number[] {
  return PROFILE_LEVELS[profile]
}

export function getAllocationWeights(stepCount: number): number[] {
  const weights: number[] = []

  for (let i = 0; i < stepCount; i++) {
    weights.push(Math.pow(1.25, i))
  }

  const totalWeight = weights.reduce((sum, value) => sum + value, 0)

  return weights.map((value) => value / totalWeight)
}

export function calculateAuroraInvestmentLadder(
  input: LadderCalculationInput
): LadderCalculationResult {
  const ticker = input.ticker.trim().toUpperCase()
  const totalCash = Number(input.totalCash)
  const referencePrice = Number(input.referencePrice)
  const profile = input.profile

  if (!ticker) {
    throw new Error("Ticker is required.")
  }

  if (!Number.isFinite(totalCash) || totalCash <= 0) {
    throw new Error("Total cash must be greater than 0.")
  }

  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error("Reference price must be greater than 0.")
  }

  const levels = getProfileLevels(profile)
  const weights = getAllocationWeights(levels.length)

  let cumulativeShares = 0

  const steps: LadderStep[] = levels.map((entryLevel, index) => {
    const percentOfTotalInvestment = weights[index]
    const entryPrice = round(referencePrice * (1 + entryLevel), 2)
    const investmentAmount = round(totalCash * percentOfTotalInvestment, 2)

    // Fractional shares allowed
    const sharesToBuy = roundShares(investmentAmount / entryPrice, 4)

    cumulativeShares = roundShares(cumulativeShares + sharesToBuy, 4)

    return {
      stepNumber: index + 1,
      entryLevel,
      entryPrice,
      investmentAmount,
      percentOfTotalInvestment: round(percentOfTotalInvestment * 100, 2),
      sharesToBuy,
      cumulativeShares,
      remainingCash: 0,
    }
  })

  let runningAllocated = 0

  const stepsWithRemainingCash = steps.map((step) => {
    runningAllocated += step.investmentAmount

    return {
      ...step,
      remainingCash: round(totalCash - runningAllocated, 2),
    }
  })

  const totalAllocated = round(
    stepsWithRemainingCash.reduce((sum, step) => sum + step.investmentAmount, 0),
    2
  )

  const totalPercentAllocated = round(
    stepsWithRemainingCash.reduce(
      (sum, step) => sum + step.percentOfTotalInvestment,
      0
    ),
    2
  )

  const totalShares = roundShares(
    stepsWithRemainingCash.reduce((sum, step) => sum + step.sharesToBuy, 0),
    4
  )

  return {
    ticker,
    totalCash: round(totalCash, 2),
    referencePrice: round(referencePrice, 2),
    profile,
    totalAllocated,
    totalPercentAllocated,
    totalShares,
    unallocatedCash: round(totalCash - totalAllocated, 2),
    steps: stepsWithRemainingCash,
    createdAt: new Date().toISOString(),
  }
}
