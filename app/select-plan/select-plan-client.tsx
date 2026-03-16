"use client";

import { useMemo, useState } from "react";
import { plans, type BillingInterval } from "@/lib/billing/plans";

function getPlanPrice(plan: any, billingInterval: BillingInterval) {
  if (billingInterval === "yearly") {
    return (
      plan?.priceYearly ??
      plan?.price_yearly ??
      plan?.yearlyPrice ??
      plan?.yearly_price ??
      plan?.prices?.yearly ??
      plan?.prices?.annual ??
      plan?.annualPrice ??
      plan?.annual_price ??
      0
    );
  }

  return (
    plan?.priceMonthly ??
    plan?.price_monthly ??
    plan?.monthlyPrice ??
    plan?.monthly_price ??
    plan?.prices?.monthly ??
    0
  );
}

function getPlanFeatures(plan: any): string[] {
  if (Array.isArray(plan?.features)) return plan.features;
  if (Array.isArray(plan?.includedFeatures)) return plan.includedFeatures;
  return [];
}

function getPlanName(plan: any) {
  return plan?.name ?? plan?.title ?? plan?.key ?? "Plan";
}

function getPlanDescription(plan: any) {
  return plan?.description ?? plan?.subtitle ?? "";
}

function getPlanKey(plan: any) {
  return plan?.key ?? plan?.id ?? plan?.slug ?? "plan";
}

export default function SelectPlanClient({
  initialBillingInterval,
}: {
  initialBillingInterval: string | null;
}) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    initialBillingInterval === "monthly" || initialBillingInterval === "yearly"
      ? initialBillingInterval
      : "yearly"
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sortedPlans = useMemo(() => [...plans], []);

  async function handleCheckout(planKey: string) {
    try {
      setError("");
      setLoadingPlan(planKey);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planKey,
          billingInterval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to start checkout");
      }

      if (!data?.url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_right,_rgba(168,85,247,0.16),_transparent_30%),linear-gradient(180deg,#061228_0%,#081936_38%,#0b2350_72%,#163d88_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Choose Your Aurora Plan
          </div>

          <h1 className="mt-6 bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
            Unlock the Aurora Dashboard
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 md:text-lg">
            Select the plan that fits your trading workflow. Once payment is
            confirmed, Aurora will unlock your dashboard automatically.
          </p>

          <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                billingInterval === "monthly"
                  ? "bg-white text-slate-900"
                  : "text-white/75 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("yearly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                billingInterval === "yearly"
                  ? "bg-white text-slate-900"
                  : "text-white/75 hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {sortedPlans.map((plan) => {
            const planKey = getPlanKey(plan);
            const planName = getPlanName(plan);
            const description = getPlanDescription(plan);
            const features = getPlanFeatures(plan);
            const price = getPlanPrice(plan, billingInterval);

            const isPopular = planKey === "pro";
            const isLoading = loadingPlan === planKey;

            return (
              <div
                key={planKey}
                className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
                  isPopular
                    ? "border-cyan-400/35 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.05]"
                }`}
              >
                {isPopular ? (
                  <div className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                    Most Popular
                  </div>
                ) : null}

                <h2 className="text-2xl font-semibold text-white">{planName}</h2>

                <p className="mt-3 min-h-[48px] text-sm text-white/65">
                  {description}
                </p>

                <div className="mt-6">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">£{price}</span>
                    <span className="pb-1 text-sm text-white/60">
                      /{billingInterval === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-white/75">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout(planKey)}
                  disabled={!!loadingPlan}
                  className={`mt-8 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isPopular
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-95"
                      : "bg-white text-slate-900 hover:bg-white/90"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {isLoading ? "Redirecting to checkout..." : `Choose ${planName}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
