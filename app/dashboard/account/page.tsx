import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  CreditCard,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountProfileForm from "./AccountProfileForm";
import EmailPreferences from "./EmailPreferences";
import BrokerConnectionSection from "./BrokerConnectionSection";

function getPlanLabel(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "elite": return "Aurora Elite";
    case "pro": return "Aurora Pro";
    case "core": return "Aurora Core";
    default: return "Aurora Free";
  }
}

function getPlanClasses(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "elite": return "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/18 via-purple-500/14 to-indigo-500/16 text-fuchsia-50";
    case "pro": return "border-cyan-400/40 bg-gradient-to-br from-cyan-500/18 via-sky-500/14 to-blue-500/16 text-cyan-50";
    case "core": return "border-blue-400/40 bg-gradient-to-br from-blue-500/18 via-sky-500/14 to-cyan-500/16 text-blue-50";
    default: return "border-white/10 bg-white/[0.04] text-slate-100";
  }
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getTimeRemaining(periodEnd: string | null | undefined) {
  if (!periodEnd) return "—";
  const end = new Date(periodEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return "1 day";
  return `${days} days`;
}

function SectionError({ label }: { label: string }) {
  return (
    <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/5 p-7">
      <div className="flex items-center gap-3 text-amber-200">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-medium">Unable to load {label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        This section could not be loaded right now. Please try refreshing the page.
      </p>
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
  } catch {
    redirect("/login");
  }

  if (!user) redirect("/login");

  // Fetch profile — don't let a failure crash the whole page
  let profile: Record<string, any> | null = null;
  let profileError = false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        full_name,
        email,
        phone,
        role,
        plan,
        plan_key,
        subscription_status,
        billing_interval,
        cancel_at_period_end,
        current_period_end,
        telegram_chat_id,
        email_weekly,
        email_monthly,
        email_quarterly,
        email_yearly,
        email_alerts
      `)
      .eq("id", user.id)
      .single();

    if (error) throw error;
    profile = data;
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    profileError = true;
  }

  const plan = profile?.plan_key ?? profile?.plan ?? "free";
  const planLabel = getPlanLabel(plan);
  const planClasses = getPlanClasses(plan);
  const subscriptionStatus = formatStatus(profile?.subscription_status);
  const currentPeriodEnd = formatDate(profile?.current_period_end);
  const timeRemaining = getTimeRemaining(profile?.current_period_end);
  const fullName = profile?.full_name?.trim() || user.user_metadata?.full_name || "";
  const email = profile?.email || user.email || "";
  const phone = profile?.phone || user.user_metadata?.phone || "";
  const joinDate = user.created_at;
  const telegramConnected = !!profile?.telegram_chat_id;
  const isPaidPlan = ["core", "pro", "elite"].includes(plan.toLowerCase());

  const emailPrefs = {
    weekly: profile?.email_weekly !== false,
    monthly: profile?.email_monthly !== false,
    quarterly: profile?.email_quarterly !== false,
    yearly: profile?.email_yearly !== false,
    alerts: profile?.email_alerts !== false,
  };

  return (
    <div className="space-y-6">
      {/* Membership hero */}
      {profileError ? (
        <SectionError label="membership details" />
      ) : (
        <section className={`rounded-[30px] border p-7 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:p-8 ${planClasses}`}>
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] opacity-80">Membership Plan</div>
              <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{planLabel}</h1>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  profile?.subscription_status === "active"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : profile?.subscription_status === "past_due"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : profile?.subscription_status === "canceled"
                        ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                        : "border-white/15 bg-white/[0.07] text-white/80"
                }`}>
                  Status: {subscriptionStatus}
                </div>
                <div className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm">
                  {profile?.subscription_status === "canceled"
                    ? "Cancelled"
                    : `Next renewal: ${currentPeriodEnd}`}
                </div>
                {timeRemaining !== "—" && timeRemaining !== "Expired" && (
                  <div className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm">
                    {timeRemaining} remaining
                  </div>
                )}
              </div>

              {profile?.subscription_status === "past_due" && (
                <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                    <AlertTriangle size={16} />
                    Payment failed — please update your payment method
                  </div>
                  <form action="/api/stripe/portal" method="post" className="mt-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30"
                    >
                      Update Payment Method
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/settings/billing"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.10] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                >
                  <CreditCard size={16} /> Manage Plan
                </Link>
                {plan.toLowerCase() !== "elite" && (
                  <Link
                    href="/dashboard/upgrade"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    <Sparkles size={16} /> Upgrade
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[rgba(4,15,38,0.55)] p-6">
              <h2 className="text-2xl font-semibold text-white">Subscription</h2>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] p-4">
                  <span className="text-sm text-slate-400">Plan</span>
                  <span className="font-semibold text-white">{planLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] p-4">
                  <span className="text-sm text-slate-400">Status</span>
                  <span className="font-semibold text-white">{subscriptionStatus}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] p-4">
                  <span className="text-sm text-slate-400">Renewal</span>
                  <span className="font-semibold text-white">{currentPeriodEnd}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] p-4">
                  <span className="text-sm text-slate-400">Auto-cancel</span>
                  <span className="font-semibold text-white">{profile?.cancel_at_period_end ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile section */}
        <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Profile</div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-300/18 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            Aurora User since {formatDate(joinDate)}
          </div>

          <AccountProfileForm
            defaultName={fullName}
            defaultEmail={email}
            defaultPhone={phone}
            lastLogin={user.last_sign_in_at || null}
            userId={user.id}
          />
        </section>

        {/* Telegram Alerts section */}
        <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-cyan-300" />
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Telegram Alerts</div>
          </div>

          <h3 className="mt-4 text-xl font-semibold text-white">
            {telegramConnected ? "Telegram Connected" : "Connect Telegram"}
          </h3>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            {telegramConnected
              ? "You are receiving Aurora alerts via Telegram. You will get notifications when watchlist stocks cross ladder entry levels, plus a weekly market summary every Friday."
              : "Scan the QR code below with your Telegram app to connect your personal Aurora alert bot. You will receive:"}
          </p>

          {!telegramConnected && (
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Alerts when watchlist stocks cross ladder entry levels
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Ticker, company, price, and suggested action
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Weekly market close summary every Friday
              </li>
            </ul>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(5,16,40,0.55)] p-6">
            {telegramConnected ? (
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                <span className="text-sm font-medium text-emerald-200">Connected and receiving alerts</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto h-40 w-40 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-10 w-10 text-white/20 mx-auto" />
                    <p className="mt-2 text-xs text-white/30">QR Code</p>
                    <p className="text-[10px] text-white/20">Coming soon</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  Search for <span className="font-mono text-cyan-300">@AuroraGrowthBot</span> on Telegram and send <span className="font-mono text-cyan-300">/start</span> to connect.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Trading 212 Connection */}
      <BrokerConnectionSection />

      {/* Email Preferences */}
      {profileError ? (
        <SectionError label="email preferences" />
      ) : (
        <EmailPreferences
          userId={user.id}
          defaults={emailPrefs}
        />
      )}
    </div>
  );
}
