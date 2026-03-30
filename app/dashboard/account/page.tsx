import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AccountProfileForm from "./AccountProfileForm";
import RestartTourButton from "./RestartTourButton";
import CopyButton from "./CopyButton";

function getPlanLabel(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "elite": return "Aurora Elite";
    case "pro": return "Aurora Pro";
    case "core": return "Aurora Core";
    default: return "Aurora Free";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }
  return (email?.[0] || "U").toUpperCase();
}

const PLAN_FEATURES: Record<string, string[]> = {
  elite: [
    "Full market scanner (Core + Alternative lists)",
    "Investment ladder calculator",
    "Aurora Intelligence AI analysis",
    "Telegram price alerts",
    "Broker integration",
    "Volatility compass",
    "Priority support",
    "Early access to new features",
  ],
  pro: [
    "Full market scanner (Core + Alternative lists)",
    "Investment ladder calculator",
    "Aurora Intelligence AI analysis",
    "Telegram price alerts",
    "Broker integration",
    "Volatility compass",
  ],
  core: [
    "Core market scanner (38 stocks)",
    "Investment ladder calculator",
    "Aurora Intelligence AI analysis",
    "Telegram price alerts",
    "Broker integration",
  ],
  free: [
    "Limited market scanner preview",
  ],
};

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

  let profile: Record<string, any> | null = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        full_name, email, phone, plan, plan_key,
        subscription_status, current_period_end, cancel_at_period_end,
        telegram_chat_id, trading212_connected, referral_code,
        login_count
      `)
      .eq("id", user.id)
      .single();
    if (error) throw error;
    profile = data;
  } catch (err) {
    console.error("Failed to fetch profile:", err);
  }

  // Watchlist count
  let watchlistCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from("watchlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    watchlistCount = count ?? 0;
  } catch { /* ignore */ }

  // Generate referral code if missing
  let referralCode = profile?.referral_code || null;
  if (!referralCode) {
    try {
      const code = user.id.replace(/-/g, "").substring(0, 8).toUpperCase();
      await supabaseAdmin.from("profiles").update({ referral_code: code }).eq("id", user.id);
      referralCode = code;
    } catch { /* ignore */ }
  }

  const plan = profile?.plan_key ?? profile?.plan ?? "free";
  const planLabel = getPlanLabel(plan);
  const fullName = profile?.full_name?.trim() || user.user_metadata?.full_name || "";
  const email = profile?.email || user.email || "";
  const phone = profile?.phone || "";
  const joinDate = user.created_at;
  const initials = getInitials(fullName, email);
  const telegramConnected = !!profile?.telegram_chat_id;
  const brokerConnected = !!profile?.trading212_connected;
  const loginCount = profile?.login_count ?? 0;
  const features = PLAN_FEATURES[plan.toLowerCase()] || PLAN_FEATURES.free;

  const statusLabel = profile?.subscription_status
    ? profile.subscription_status.charAt(0).toUpperCase() + profile.subscription_status.slice(1).replace(/_/g, " ")
    : "Unknown";

  const statusColor = profile?.subscription_status === "active"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : profile?.subscription_status === "past_due"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
      : "border-white/10 bg-white/5 text-slate-400";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-2">

      {/* ═══ SECTION 1 — Profile Header ═══ */}
      <section className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)] text-2xl font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">{fullName || "Aurora Member"}</h1>
            <p className="mt-1 text-base text-slate-400">{email}</p>
            <p className="mt-1 text-sm text-violet-300/80">
              Aurora member since {formatDate(joinDate)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3.5 py-1.5 text-xs font-semibold text-fuchsia-200">
            {planLabel}
          </span>
          <span className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
          <span className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
            brokerConnected
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/25 bg-rose-400/10 text-rose-300"
          }`}>
            {brokerConnected ? "Broker Connected" : "Broker Disconnected"}
          </span>
          {telegramConnected && (
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300">
              Telegram Connected
            </span>
          )}
        </div>
      </section>

      {/* ═══ SECTION 2 — Aurora Journey Stats ═══ */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Member Since", value: formatDate(joinDate) },
          { label: "Watchlist", value: `${watchlistCount} stocks` },
          { label: "Logins", value: `${loginCount} sessions` },
          { label: "Alerts", value: telegramConnected ? "Active" : "Not set up" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/8 bg-[rgba(8,20,43,0.9)] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
            <div className="mt-2 text-lg font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </section>

      {/* ═══ SECTION 3 — Subscription Details ═══ */}
      <section className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Current Plan</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{planLabel}</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-400">
              <div>Status: <span className="text-white">{statusLabel}</span></div>
              <div>
                {profile?.cancel_at_period_end
                  ? <>Cancels: <span className="text-white">{formatDate(profile?.current_period_end)}</span></>
                  : <>Renews: <span className="text-white">{formatDate(profile?.current_period_end)}</span></>
                }
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <CreditCard className="h-4 w-4" /> Manage Plan
          </Link>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Plan Features</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-400">&#10003;</span>
              {f}
            </div>
          ))}
        </div>

        {plan.toLowerCase() !== "elite" && (
          <div className="mt-6">
            <Link
              href="/dashboard/upgrade"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" /> Upgrade Plan
            </Link>
          </div>
        )}
      </section>

      {/* ═══ SECTION 4 — Profile Settings ═══ */}
      <section className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Profile Settings</div>

        <AccountProfileForm
          defaultName={fullName}
          defaultEmail={email}
          defaultPhone={phone}
          lastLogin={user.last_sign_in_at || null}
          userId={user.id}
        />

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Security</div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/reset-password"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Change password
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign out all devices
            </button>
          </form>
        </div>
      </section>

      {/* ═══ SECTION 5 — Referral System ═══ */}
      <section className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎁</span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Refer a Friend</div>
            <p className="mt-1 text-sm text-slate-300">Get 1 free month for every friend who subscribes</p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs text-slate-500">Your referral link</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-3 font-mono text-sm text-cyan-300">
              app.auroragrowth.co.uk/signup?ref={referralCode || "..."}
            </div>
            <CopyButton text={`https://app.auroragrowth.co.uk/signup?ref=${referralCode || ""}`} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Friends Referred</div>
            <div className="mt-2 text-2xl font-semibold text-white">0</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Free Months Earned</div>
            <div className="mt-2 text-2xl font-semibold text-white">0</div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 — Account Actions ═══ */}
      <section className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account Actions</div>

        <div className="mt-5 flex flex-wrap gap-3">
          <RestartTourButton />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              📤 Sign out
            </button>
          </form>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/5 px-5 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10"
            title="Contact support to delete your account"
          >
            🗑 Delete account
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Account deletion is permanent. Contact support@auroragrowth.co.uk to request deletion.
        </p>
      </section>
    </div>
  );
}
