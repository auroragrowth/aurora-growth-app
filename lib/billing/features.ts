import { normalisePlanKey } from "@/lib/billing/theme";

export function hasInvestmentTracking(plan?: string | null) {
  const key = normalisePlanKey(plan);
  return key === "pro" || key === "elite";
}

export function hasAdvancedScanner(plan?: string | null) {
  const key = normalisePlanKey(plan);
  return key === "pro" || key === "elite";
}

export function hasEliteFeatures(plan?: string | null) {
  const key = normalisePlanKey(plan);
  return key === "elite";
}
