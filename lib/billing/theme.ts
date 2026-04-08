export type PlanKey = "free" | "core" | "pro" | "elite" | "none";

export function normalisePlanKey(plan?: string | null): PlanKey {
  const value = (plan || "").toLowerCase().trim();

  if (value === "core") return "core";
  if (value === "pro") return "pro";
  if (value === "elite") return "elite";
  if (value === "free") return "free";

  return "none";
}

export function getPlanLabel(plan?: string | null) {
  const key = normalisePlanKey(plan);

  switch (key) {
    case "core":
      return "Core Membership";
    case "pro":
      return "Pro Membership";
    case "elite":
      return "Elite Membership";
    default:
      return "Core Membership";
  }
}

export function getPlanShortLabel(plan?: string | null) {
  const key = normalisePlanKey(plan);

  switch (key) {
    case "core":
      return "Core";
    case "pro":
      return "Pro";
    case "elite":
      return "Elite";
    default:
      return "Core";
  }
}

export function getPlanTheme(plan?: string | null) {
  const key = normalisePlanKey(plan);

  switch (key) {
    case "core":
      return {
        card:
          "border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,47,73,0.92),rgba(3,7,18,0.95))]",
        pill:
          "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
        text: "text-cyan-300",
      };

    case "pro":
      return {
        card:
          "border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(76,29,149,0.30),rgba(3,7,18,0.95))]",
        pill:
          "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
        text: "text-fuchsia-300",
      };

    case "elite":
      return {
        card:
          "border-amber-400/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.30),rgba(3,7,18,0.95))]",
        pill:
          "border-amber-400/25 bg-amber-500/10 text-amber-300",
        text: "text-amber-300",
      };

    default:
      return {
        card:
          "border-slate-400/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.80),rgba(2,6,23,0.95))]",
        pill:
          "border-slate-400/20 bg-slate-500/10 text-slate-300",
        text: "text-slate-300",
      };
  }
}
