export type LadderProfile = 30 | 40 | 50 | 60 | 70

export interface LadderStep {
  stepNumber: number
  entryLevel: number
  entryPrice: number
  investmentAmount: number
  percentOfTotalInvestment: number
  sharesToBuy: number
  cumulativeShares: number
  remainingCash: number
}

export interface LadderCalculationInput {
  ticker: string
  totalCash: number
  referencePrice: number
  profile: LadderProfile
}

export interface LadderCalculationResult {
  ticker: string
  totalCash: number
  referencePrice: number
  profile: LadderProfile
  totalAllocated: number
  totalPercentAllocated: number
  totalShares: number
  unallocatedCash: number
  steps: LadderStep[]
  createdAt: string
}
