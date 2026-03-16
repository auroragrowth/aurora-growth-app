"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

type PlanType = "core" | "pro" | "elite";

const planMeta: Record<
  PlanType,
  {
    label: string;
    price: string;
    badgeClass: string;
    cardClass: string;
    icon: React.ReactNode;
    description: string;
    features: string[];
  }
> = {
  core: {
    label: "Aurora Core",
    price: "£79/mo",
    badgeClass: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
    cardClass:
      "bg-[linear-gradient(180deg,rgba(14,45,88,0.96)_0%,rgba(8,24,54,0.96)_100%)] border-cyan-300/20",
    icon: <Zap className="h-5 w-5" />,
    description: "Essential access for the core Aurora platform experience.",
    features: [
      "Member dashboard",
      "Core platform access",
      "Watchlist tools",
      "Account area",
    ],
  },
  pro: {
    label: "Aurora Pro",
    price: "£149/mo",
    badgeClass: "border-violet-300/25 bg-violet-300/10 text-violet-200",
    cardClass:
      "bg-[linear-gradient(180deg,rgba(90,41,128,0.98)_0%,rgba(40,28,88,0.98)_100%)] border-violet-300/20",
    icon: <Sparkles className="h-5 w-5" />,
    description: "Expanded access with more advanced analysis features.",
    features: [
      "Everything in Core",
      "Advanced analysis tools",
      "Expanded features",
      "Priority feature access",
    ],
  },
  elite: {
    label: "Aurora Elite",
    price: "£345/mo",
    badgeClass: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    cardClass:
      "bg-[linear-gradient(180deg,rgba(99,69,24,0.98)_0%,rgba(52,35,19,0.98)_100%)] border-amber-300/20",
    icon: <Crown className="h-5 w-5" />,
    description: "Highest tier access with premium features and support.",
    features: [
      "Everything in Pro",
      "Premium analytics",
      "Priority support",
      "Elite platform access",
    ],
  },
};

function CheckoutInner() {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const plan: PlanType =
    rawPlan === "pro" || rawPlan === "elite" ? rawPlan : "core";

  const selectedPlan = planMeta[plan];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_22%),linear-gradient(180deg,rgba(7,23,54,0.92)_0%,rgba(3,14,36,0.96)_100%)] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="px-6 py-8 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200">
              Secure checkout
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Complete your Aurora upgrade.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/72 sm:text-base">
              Review your selected plan below. Once your checkout route is wired
              to Stripe, this page becomes your live subscription handoff.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section
          className={`rounded-[32px] border p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)] ${selectedPlan.cardClass}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${selectedPlan.badgeClass}`}
            >
              {selectedPlan.icon}
            </div>

            <div>
              <h2 className="text-3xl font-semibold text-white">
                {selectedPlan.label}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                {selectedPlan.description}
              </p>
            </div>
          </div>

          <div className="mt-8 text-5xl font-semibold tracking-tight text-white">
            {selectedPlan.price}
          </div>

          <div className="mt-8 space-y-4">
            {selectedPlan.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 text-white/85"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm leading-6">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,18,44,0.88)_0%,rgba(3,12,31,0.94)_100%)] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Checkout setup
              </h3>
              <p className="mt-1 text-sm text-blue-100/70">
                This page is ready for your Stripe checkout handoff.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Payment step placeholder
            </div>
            <p className="mt-3 text-sm leading-6 text-blue-100/70">
              Next step is wiring this button to your Stripe checkout session or
              billing portal route.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#1ec8ff_0%,#8b5cf6_100%)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
            >
              Continue to payment
            </button>

            <Link
              href="/dashboard/upgrade"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to plans
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,18,44,0.88)_0%,rgba(3,12,31,0.94)_100%)] p-8 text-blue-100/70">
          Loading checkout...
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
