export type PlanKey = "core" | "pro" | "elite"
export type BillingInterval = "monthly" | "yearly"

/** Client-safe plan shape returned by /api/plans */
export interface Plan {
  key: PlanKey
  name: string
  monthlyPrice: number
  yearlyMonthlyPrice: number
  yearlyTotalPrice: number
  features: string[]
}

/** Static feature lists — keyed by plan */
export const planFeatures: Record<PlanKey, string[]> = {
  core: [
    "Market scanner",
    "Watchlists",
    "Aurora stock analysis",
    "Investment ladder calculator",
    "Core data access",
  ],
  pro: [
    "Everything in Core",
    "Advanced scanner filters",
    "More alerts",
    "More watchlists",
    "Enhanced data",
  ],
  elite: [
    "Everything in Pro",
    "Unlimited alerts",
    "Full Aurora datasets",
    "Advanced analytics",
    "Priority features",
  ],
}
