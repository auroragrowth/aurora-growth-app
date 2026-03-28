"use client";

import { useState } from "react";
import type { BillingInterval, Plan } from "@/lib/billing/plans";
import WelcomePopup from "@/components/onboarding/WelcomePopup";

export default function SelectPlanClient({
  plans,
  initialBillingInterval,
  showWelcome,
}: {
  plans: Plan[];
  initialBillingInterval: string | null;
  showWelcome: boolean;
}) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    initialBillingInterval === "monthly" ? "monthly" : "yearly"
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const showWelcomePopup = showWelcome && !welcomeDismissed;

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
    <>
      {showWelcomePopup && (
        <WelcomePopup onDismiss={() => setWelcomeDismissed(true)} />
      )}

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
                <span className="ml-1.5 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Save ~17%
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
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const price =
                billingInterval === "yearly"
                  ? plan.yearlyMonthlyPrice
                  : plan.monthlyPrice;
              const isPopular = plan.key === "pro";
              const isLoading = loadingPlan === plan.key;

              return (
                <div
                  key={plan.key}
                  className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl transition ${
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

                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.key)}
                    disabled={!!loadingPlan}
                    className={`mt-8 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isPopular
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-95"
                        : "bg-white text-slate-900 hover:bg-white/90"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isLoading ? "Redirecting..." : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-white/35">
            No free trials. Cancel any time from your account settings.
          </p>
        </div>
      </main>
    </>
  );
}
