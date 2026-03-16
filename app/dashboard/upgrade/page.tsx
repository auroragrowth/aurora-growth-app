"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PlanType = "free" | "core" | "pro" | "elite";

type ProfileRow = {
  plan?: string | null;
  plan_expires_at?: string | null;
};

function normalisePlan(plan?: string | null): PlanType {
  const value = String(plan || "").toLowerCase();

  if (value.includes("elite")) return "elite";
  if (value.includes("pro")) return "pro";
  if (value.includes("core")) return "core";
  return "free";
}

function formatExpiry(value?: string | null) {
  if (!value) return "No renewal date set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No renewal date set";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const planMeta: Record<
  PlanType,
  {
    label: string;
    shortLabel: string;
    price: string;
    accent: string;
    badgeClass: string;
    icon: React.ReactNode;
    features: string[];
    ringClass: string;
    surfaceClass: string;
    buttonClass: string;
    glowClass: string;
    popular?: boolean;
  }
> = {
  free: {
    label: "Aurora Free",
    shortLabel: "Free",
    price: "£0",
    accent: "Starter access",
    badgeClass: "border-white/15 bg-white/10 text-white/80",
    icon: <Sparkles className="h-5 w-5" />,
    features: [
      "Basic dashboard access",
      "Starter account area",
      "Limited platform features",
    ],
    ringClass: "border-white/10",
    surfaceClass:
      "bg-[linear-gradient(180deg,rgba(18,24,39,0.92)_0%,rgba(8,12,24,0.96)_100%)]",
    buttonClass:
      "border border-white/15 bg-white/10 text-white hover:bg-white/15",
    glowClass: "before:bg-white/10",
  },
  core: {
    label: "Aurora Core",
    shortLabel: "Core",
    price: "£79",
    accent: "Core platform access",
    badgeClass: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
    icon: <Zap className="h-5 w-5" />,
    features: [
      "Member dashboard",
      "Core platform access",
      "Watchlist tools",
      "Account area",
    ],
    ringClass: "border-cyan-300/20",
    surfaceClass:
      "bg-[linear-gradient(180deg,rgba(14,45,88,0.96)_0%,rgba(8,24,54,0.96)_100%)]",
    buttonClass:
      "bg-[linear-gradient(90deg,#1ec8ff_0%,#8b5cf6_100%)] text-slate-950 hover:opacity-95",
    glowClass: "before:bg-cyan-400/20",
  },
  pro: {
    label: "Aurora Pro",
    shortLabel: "Pro",
    price: "£149",
    accent: "Expanded access",
    badgeClass: "border-violet-300/25 bg-violet-300/10 text-violet-200",
    icon: <Sparkles className="h-5 w-5" />,
    features: [
      "Everything in Core",
      "Advanced analysis tools",
      "Expanded features",
      "Priority feature access",
    ],
    ringClass: "border-violet-300/30",
    surfaceClass:
      "bg-[linear-gradient(180deg,rgba(90,41,128,0.98)_0%,rgba(40,28,88,0.98)_100%)]",
    buttonClass:
      "bg-[linear-gradient(90deg,#1ec8ff_0%,#8b5cf6_100%)] text-slate-950 hover:opacity-95",
    glowClass: "before:bg-violet-400/25",
    popular: true,
  },
  elite: {
    label: "Aurora Elite",
    shortLabel: "Elite",
    price: "£345",
    accent: "Highest tier access",
    badgeClass: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    icon: <Crown className="h-5 w-5" />,
    features: [
      "Everything in Pro",
      "Premium analytics",
      "Priority support",
      "Elite platform access",
    ],
    ringClass: "border-amber-300/20",
    surfaceClass:
      "bg-[linear-gradient(180deg,rgba(99,69,24,0.98)_0%,rgba(52,35,19,0.98)_100%)]",
    buttonClass:
      "bg-[linear-gradient(90deg,#1ec8ff_0%,#8b5cf6_100%)] text-slate-950 hover:opacity-95",
    glowClass: "before:bg-amber-400/20",
  },
};

export default function UpgradePage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("plan, plan_expires_at")
          .eq("id", user.id)
          .single<ProfileRow>();

        if (!mounted) return;

        setCurrentPlan(normalisePlan(data?.plan));
        setExpiresAt(data?.plan_expires_at || null);
      } catch (error) {
        console.error("Failed to load plan", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const current = planMeta[currentPlan];
  const plans: PlanType[] = ["core", "pro", "elite"];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_22%),linear-gradient(180deg,rgba(7,23,54,0.92)_0%,rgba(3,14,36,0.96)_100%)] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.12),transparent_24%)]" />
        <div className="relative px-6 py-8 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200">
              Current subscription
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Choose your Aurora plan.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/72 sm:text-base">
              Upgrade your Aurora experience with cleaner tools, deeper insight
              and more powerful platform access.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,18,44,0.88)_0%,rgba(3,12,31,0.94)_100%)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${current.badgeClass}`}
            >
              {current.icon}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100/50">
                Current subscription — {loading ? "Loading..." : current.label}
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {loading ? "Checking your plan..." : current.label}
              </h2>
              <p className="mt-2 text-sm text-blue-100/70">
                {loading
                  ? "Loading your current subscription details."
                  : `Renewal / expiry: ${formatExpiry(expiresAt)}`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/50">
                Subscription
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "Loading..." : current.shortLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/50">
                Billing
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {loading ? "Loading..." : formatExpiry(expiresAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {plans.map((plan) => {
          const meta = planMeta[plan];
          const isCurrent = currentPlan === plan;
          const isPopular = !!meta.popular;

          return (
            <div
              key={plan}
              className={`group relative overflow-hidden rounded-[32px] border ${meta.ringClass} ${meta.surfaceClass} p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(0,0,0,0.3)]`}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-32 blur-3xl opacity-60 ${meta.glowClass}`}
              />

              {isPopular ? (
                <div className="relative mb-6 inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-violet-200">
                  Most popular
                </div>
              ) : (
                <div className="mb-6 h-[30px]" />
              )}

              <div className="relative flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${meta.badgeClass}`}
                >
                  {meta.icon}
                </div>

                <div>
                  <h3 className="text-[2rem] font-semibold tracking-tight text-white">
                    {meta.label}
                  </h3>
                  <p className="mt-1 text-sm text-white/70">{meta.accent}</p>
                </div>
              </div>

              <div className="relative mt-8 flex items-end gap-2">
                <div className="text-5xl font-semibold tracking-tight text-white">
                  {meta.price}
                </div>
                <div className="pb-2 text-xl text-white/65">/mo</div>
              </div>

              <div className="relative mt-8 space-y-4">
                {meta.features.map((feature) => (
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

              <div className="relative mt-10">
                {isCurrent ? (
                  <div
                    className={`inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold ${meta.badgeClass}`}
                  >
                    Current plan
                  </div>
                ) : (
                  <Link
                    href={`/dashboard/checkout?plan=${plan}`}
                    className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${meta.buttonClass}`}
                  >
                    Start {meta.shortLabel}
                  </Link>
                )}
              </div>

              {isPopular ? (
                <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-violet-300/20" />
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
