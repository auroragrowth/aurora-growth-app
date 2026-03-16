import Link from "next/link";

type SidebarPlanCardProps = {
  plan?: string | null;
  active?: boolean;
};

function getPlanStyles(plan?: string | null, active?: boolean) {
  const value = (plan || "").toLowerCase();

  if (!active || !value || value === "free" || value === "no plan") {
    return {
      wrapper:
        "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] shadow-[0_0_0_rgba(0,0,0,0)]",
      badge:
        "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      button:
        "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
    };
  }

  if (value === "core") {
    return {
      wrapper:
        "border-cyan-400/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,rgba(8,47,73,0.95),rgba(2,6,23,0.98))] shadow-[0_0_35px_rgba(34,211,238,0.14)]",
      badge:
        "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
      button:
        "border-cyan-400/30 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25",
    };
  }

  if (value === "pro") {
    return {
      wrapper:
        "border-fuchsia-400/25 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_35%),linear-gradient(180deg,rgba(88,28,135,0.95),rgba(2,6,23,0.98))] shadow-[0_0_40px_rgba(217,70,239,0.16)]",
      badge:
        "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100",
      button:
        "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-50 hover:bg-fuchsia-500/25",
    };
  }

  return {
    wrapper:
      "border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),linear-gradient(180deg,rgba(120,53,15,0.95),rgba(2,6,23,0.98))] shadow-[0_0_42px_rgba(251,191,36,0.16)]",
    badge:
      "border-amber-300/30 bg-amber-400/15 text-amber-100",
    button:
      "border-amber-300/30 bg-amber-400/15 text-amber-50 hover:bg-amber-400/25",
  };
}

export default function SidebarPlanCard({
  plan,
  active,
}: SidebarPlanCardProps) {
  const planName = plan || "No plan";
  const styles = getPlanStyles(planName, active);

  return (
    <div
      className={[
        "rounded-3xl border p-5 transition-all duration-300",
        styles.wrapper,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold capitalize text-white">
            {planName}
          </div>
          <div className="mt-1 text-sm text-white/70">
            Plan {active ? "active" : "inactive"}
          </div>
        </div>

        <span
          className={[
            "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
            styles.badge,
          ].join(" ")}
        >
          {active ? "Active" : "Inactive"}
        </span>
      </div>

      <Link
        href="/dashboard/upgrade"
        className={[
          "mt-5 inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition",
          styles.button,
        ].join(" ")}
      >
        Manage your plan
      </Link>
    </div>
  );
}
