export type PlanKey = "core" | "pro" | "elite"
export type BillingInterval = "monthly" | "yearly"
import { createClient } from "@/lib/supabase/server";

export interface Plan {
  key: PlanKey
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  stripeMonthlyPriceId: string
  stripeYearlyPriceId: string
  features: string[]
}

export const plans: Plan[] = [
  {
    key: "core",
    name: "Aurora Core",
    description: "Perfect for focused investors",
    monthlyPrice: 33.95,
    yearlyPrice: 28.29,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_CORE_MONTHLY!,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_CORE_YEARLY!,
    features: [
      "Market scanner",
      "Watchlists",
      "Aurora stock analysis",
      "Investment ladder calculator",
      "Core data access"
    ]
  },
  {
    key: "pro",
    name: "Aurora Pro",
    description: "For active growth investors",
    monthlyPrice: 67.95,
    yearlyPrice: 56.49,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY!,
    features: [
      "Everything in Core",
      "Advanced scanner filters",
      "More alerts",
      "More watchlists",
      "Enhanced data"
    ]
  },
  {
    key: "elite",
    name: "Aurora Elite",
    description: "Full power Aurora platform",
    monthlyPrice: 239.95,
    yearlyPrice: 199.95,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_ELITE_YEARLY!,
    features: [
      "Everything in Pro",
      "Unlimited alerts",
      "Full Aurora datasets",
      "Advanced analytics",
      "Priority features"
    ]
  }
]

export function getPlan(planKey: PlanKey) {
  return plans.find((p) => p.key === planKey)
}

export function getStripePriceId(planKey: PlanKey, interval: BillingInterval) {
  const plan = getPlan(planKey)

  if (!plan) throw new Error("Plan not found")

  return interval === "monthly"
    ? plan.stripeMonthlyPriceId
    : plan.stripeYearlyPriceId
}
