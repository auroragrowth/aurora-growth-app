"use client";

import { useState } from "react";
import type { BillingInterval, Plan } from "@/lib/billing/plans";
import { useSubscription } from "@/components/providers/SubscriptionProvider";

function formatExpiry(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function UpgradeClient({
  plans,
  currentPlan,
  subscriptionStatus,
  currentPeriodEnd,
}: {
  plans: Plan[];
  currentPlan: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}) {
  const { planKey: contextPlanKey } = useSubscription();
  const activePlan = currentPlan || contextPlanKey || "core";

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const renewalDate = formatExpiry(currentPeriodEnd);

  async function handleCheckout(planKey: string) {
    try {
      setError("");
      setLoadingPlan(planKey);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingInterval }),
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
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="text-center">
        <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Upgrade Your Plan
        </div>

        <h1 className="mt-6 bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
          {isActive ? "Manage your Aurora plan" : "Choose your Aurora plan"}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70 md:text-base">
          Upgrade your Aurora experience with deeper insight and more powerful
          platform access.
        </p>

        {/* Billing toggle */}
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
            <span className="ml-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
              Save 17%
            </span>
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price =
            billingInterval === "yearly"
              ? plan.yearlyMonthlyPrice
              : plan.monthlyPrice;
          const isCurrent = activePlan === plan.key;
          const isPopular = plan.key === "pro";
          const isLoading = loadingPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl transition ${
                isCurrent
                  ? "border-cyan-400/40 bg-white/[0.06]"
                  : isPopular
                    ? "border-cyan-400/35 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.05]"
              }`}
              style={
                isCurrent
                  ? {
                      boxShadow: "0 0 0 2px rgba(34,211,238,0.5), 0 0 30px rgba(34,211,238,0.12), 0 20px 80px rgba(0,0,0,0.28)",
                    }
                  : undefined
              }
            >

              {isCurrent ? (
                <div className="mb-4 inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  Current Plan
                </div>
              ) : isPopular ? (
                <div className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  Most Popular
                </div>
              ) : (
                <div className="mb-4 h-[26px]" />
              )}

              <h2 className="text-2xl font-semibold text-white">
                {plan.name}
              </h2>

              <p className="mt-3 min-h-[44px] text-sm text-white/65">
                {plan.key === "core"
                  ? "Perfect for focused investors"
                  : plan.key === "pro"
                    ? "For active growth investors"
                    : "Full power Aurora platform"}
              </p>

              <div className="mt-6">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-white">
                    £{price.toFixed(2)}
                  </span>
                  <span className="pb-1 text-sm text-white/60">
                    /{billingInterval === "yearly" ? "mo billed annually" : "month"}
                  </span>
                </div>
                {billingInterval === "yearly" ? (
                  <p className="mt-1 text-xs text-white/45">
                    £{plan.yearlyTotalPrice.toFixed(2)} per year
                  </p>
                ) : null}
              </div>

              <ul className="mt-6 space-y-3 text-sm text-white/75">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isCurrent ? (
                  <div className="w-full rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-center text-sm font-semibold text-emerald-100">
                    Your current plan
                    {isActive && renewalDate ? (
                      <span className="mt-1 block text-xs font-normal text-emerald-200/60">
                        Renews {renewalDate}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.key)}
                    disabled={!!loadingPlan}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isPopular
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-95"
                        : "bg-white text-slate-900 hover:bg-white/90"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isLoading ? "Redirecting..." : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-white/35">
        No free trials. Cancel any time from your account settings.
      </p>
    </div>
  );
}
