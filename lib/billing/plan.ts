export type PlanKey = "core" | "pro" | "elite";

export function normalisePlanKey(value?: string | null): PlanKey | null {
  const v = (value || "").toLowerCase();

  if (v === "elite") return "elite";
  if (v === "pro") return "pro";
  if (v === "core") return "core";

  return null;
}

export function getPlanLabel(planKey?: string | null): string {
  const plan = normalisePlanKey(planKey);

  switch (plan) {
    case "elite":
      return "Elite";
    case "pro":
      return "Pro";
    case "core":
      return "Core";
    default:
      return "No plan";
  }
}

export function isPlanActive(status?: string | null): boolean {
  return status === "active" || status === "trialing";
}
