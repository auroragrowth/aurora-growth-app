import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  CreditCard,
  CalendarDays,
} from "lucide-react";
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
      return "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/18 via-purple-500/14 to-indigo-500/16 text-fuchsia-50";
    case "pro":
      return "border-cyan-400/40 bg-gradient-to-br from-cyan-500/18 via-sky-500/14 to-blue-500/16 text-cyan-50";
    case "core":
      return "border-blue-400/40 bg-gradient-to-br from-blue-500/18 via-sky-500/14 to-cyan-500/16 text-blue-50";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-100";
  }
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatInterval(value: string | null | undefined) {
  if (!value) return "Not set";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      full_name,
      role,
      plan,
      plan_key,
      subscription_status,
      billing_interval,
      cancel_at_period_end,
      current_period_end,
      updated_at
    `)
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? profile?.plan_key ?? "free";
  const planLabel = getPlanLabel(plan);
  const planClasses = getPlanClasses(plan);
  const subscriptionStatus = formatStatus(profile?.subscription_status);
  const billingInterval = formatInterval(profile?.billing_interval);
  const currentPeriodEnd = formatDate(profile?.current_period_end);
  const fullName = profile?.full_name?.trim() || "Aurora member";
  const role = profile?.role || "Member";

  return (
    <div className="space-y-6">
      <section
        className={`rounded-[30px] border p-7 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:p-8 ${planClasses}`}
      >
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] opacity-80">
              Membership Plan
            </div>

            <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
              {planLabel}
            </h1>

            <p className="mt-4 max-w-3xl text-base opacity-85 md:text-[1.1rem]">
              Your Aurora account controls access to dashboard tools, scanner
              features, watchlists, account settings, and premium research pages.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm">
                Status: {subscriptionStatus}
              </div>
              <div className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm">
                Billing: {billingInterval}
              </div>
              <div className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm">
                Renewal: {currentPeriodEnd}
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.10] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
              >
                <CreditCard size={16} />
                Manage Plan
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[rgba(4,15,38,0.55)] p-6">
            <h2 className="text-2xl font-semibold text-white">Plan benefits</h2>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-lg font-medium text-white">Current status</div>
                  <div className="text-sm text-slate-300">
                    {subscriptionStatus}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-100">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-lg font-medium text-white">Membership plan</div>
                  <div className="text-sm text-slate-300">
                    {planLabel}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-100">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="text-lg font-medium text-white">Billing</div>
                  <div className="text-sm text-slate-300">
                    {billingInterval} subscription
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-100">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <div className="text-lg font-medium text-white">Next renewal</div>
                  <div className="text-sm text-slate-300">
                    {currentPeriodEnd}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
            Profile
          </div>

          <div className="mt-8 space-y-7">
            <div>
              <div className="text-sm text-slate-400">Full name</div>
              <div className="mt-2 text-3xl font-medium text-white">
                {fullName}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-400">Email</div>
              <div className="mt-2 text-2xl font-medium text-white break-all">
                {user.email}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-400">Role</div>
              <div className="mt-2 text-2xl font-medium text-white">
                {role}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
            Subscription Details
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-[rgba(5,16,40,0.55)] p-5">
              <div className="text-sm text-slate-400">Plan key</div>
              <div className="mt-3 text-2xl font-medium text-white">
                {String(plan).toLowerCase()}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[rgba(5,16,40,0.55)] p-5">
              <div className="text-sm text-slate-400">Subscription status</div>
              <div className="mt-3 text-2xl font-medium text-white">
                {subscriptionStatus}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[rgba(5,16,40,0.55)] p-5">
              <div className="text-sm text-slate-400">Current period end</div>
              <div className="mt-3 text-2xl font-medium text-white">
                {currentPeriodEnd}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[rgba(5,16,40,0.55)] p-5">
              <div className="text-sm text-slate-400">Cancel at period end</div>
              <div className="mt-3 text-2xl font-medium text-white">
                {profile?.cancel_at_period_end ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
