import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, CreditCard, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function getPlanLabel(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "elite":
      return "Aurora Elite";
    case "pro":
      return "Aurora Pro";
    case "core":
      return "Aurora Core";
    default:
      return "Aurora Free";
  }
}

function getPlanClasses(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "elite":
      return "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/16 to-indigo-500/18 text-fuchsia-50";
    case "pro":
      return "border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 via-sky-500/16 to-blue-500/18 text-cyan-50";
    case "core":
      return "border-blue-400/40 bg-gradient-to-br from-blue-500/20 via-sky-500/14 to-cyan-500/18 text-blue-50";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-100";
  }
}

function formatInterval(interval: string | null | undefined) {
  if (!interval) return "Not set";
  return interval.charAt(0).toUpperCase() + interval.slice(1);
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

export default async function BillingSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_key, subscription_status, billing_interval, cancel_at_period_end, updated_at")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? profile?.plan_key ?? "free";
  const planLabel = getPlanLabel(plan);
  const planClasses = getPlanClasses(plan);
  const subscriptionStatus = formatStatus(profile?.subscription_status);
  const billingInterval = formatInterval(profile?.billing_interval);
  const cancelAtPeriodEnd = profile?.cancel_at_period_end ?? false;

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,21,50,0.88),rgba(4,13,32,0.92))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:p-8">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/75">
          Aurora Growth
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
          Plan & Billing
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-lg">
          View your current Aurora subscription, billing cycle, and account access.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className={`rounded-[28px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)] ${planClasses}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Crown size={18} />
                <span className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
                  Current Plan
                </span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold">{planLabel}</h2>
              <p className="mt-2 text-sm opacity-85">
                Your subscription details are shown below.
              </p>
            </div>

            <Link
              href="/dashboard/upgrade"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
            >
              <CreditCard size={16} />
              Change plan
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">
                Subscription Status
              </div>
              <div className="mt-2 text-xl font-semibold">{subscriptionStatus}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">
                Billing Interval
              </div>
              <div className="mt-2 text-xl font-semibold">{billingInterval}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">
                Renewal State
              </div>
              <div className="mt-2 text-xl font-semibold">
                {cancelAtPeriodEnd ? "Cancels at period end" : "Renews automatically"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">
                Last Profile Update
              </div>
              <div className="mt-2 text-xl font-semibold">
                {profile?.updated_at
                  ? new Date(profile.updated_at).toLocaleDateString("en-GB")
                  : "Not available"}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-[rgba(5,14,32,0.78)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            <div className="flex items-center gap-2 text-cyan-100">
              <ShieldCheck size={18} />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Access Summary
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Current access level: <span className="font-semibold text-white">{planLabel}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Billing cycle: <span className="font-semibold text-white">{billingInterval}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Account status: <span className="font-semibold text-white">{subscriptionStatus}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[rgba(5,14,32,0.78)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            <div className="flex items-center gap-2 text-cyan-100">
              <CalendarDays size={18} />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Quick Actions
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <Link
                href="/dashboard/upgrade"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-medium text-white transition hover:bg-white/[0.07]"
              >
                <span>View available Aurora plans</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/dashboard/account"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-medium text-white transition hover:bg-white/[0.07]"
              >
                <span>Go to account settings</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-medium text-white transition hover:bg-white/[0.07]"
              >
                <span>Return to dashboard</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
