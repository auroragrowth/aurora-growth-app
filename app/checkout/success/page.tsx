"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "active" | "waiting" | "error";

const QUOTES = [
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton" },
  { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { text: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { text: "Wide diversification is only required when investors do not understand what they are doing.", author: "Warren Buffett" },
  { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Ben Graham" },
  { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
];

function getPlanLabel(planKey: string | null): string {
  switch (planKey) {
    case "elite": return "Aurora Elite";
    case "pro": return "Aurora Pro";
    case "core": return "Aurora Core";
    default: return "Aurora";
  }
}

export default function CheckoutSuccessPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("checking");
  const [attempts, setAttempts] = useState(0);
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [showBrokerConnect, setShowBrokerConnect] = useState(false);

  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) setStatus("error");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, plan_key")
          .eq("id", user.id)
          .single();

        const isActive =
          profile?.subscription_status === "active" ||
          profile?.subscription_status === "trialing";

        if (!cancelled) {
          setAttempts((n) => n + 1);
          if (profile?.plan_key) setPlanKey(profile.plan_key);

          if (isActive) {
            setStatus("active");
          } else {
            setStatus("waiting");
          }
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [supabase]);

  // Stop polling once active
  useEffect(() => {
    if (status !== "active") return;
    // No auto-redirect - let user choose their path
  }, [status]);

  if (showBrokerConnect) {
    return (
      <BrokerConnectInline
        onSkip={() => { window.location.href = "/dashboard"; }}
        onConnected={() => { window.location.href = "/dashboard"; }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_28%),radial-gradient(circle_at_right,_rgba(168,85,247,0.12),_transparent_30%),linear-gradient(180deg,_#040816_0%,_#081120_55%,_#050816_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[88vh] max-w-3xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            Aurora Growth
          </p>

          {status === "active" ? (
            <>
              <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-8 w-8 text-emerald-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>

              <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
                Welcome to Aurora Growth
              </h1>

              <div className="mt-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-sm font-semibold text-cyan-200">
                {getPlanLabel(planKey)}
              </div>

              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
                <p className="text-sm italic leading-7 text-white/70">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="mt-2 text-xs text-white/40">
                  &mdash; {quote.author}
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setShowBrokerConnect(true)}
                  className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:brightness-110"
                >
                  Connect Trading 212 to unlock your full portfolio
                </button>

                <a
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Skip for now &mdash; go to dashboard
                </a>
              </div>
            </>
          ) : status === "error" ? (
            <>
              <h1 className="mt-6 text-3xl font-bold text-white">
                Something went wrong
              </h1>
              <p className="mt-4 text-base text-white/65">
                We could not confirm your session. Please sign in and check
                your account.
              </p>
              <a
                href="/login"
                className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to login
              </a>
            </>
          ) : (
            <>
              <h1 className="mt-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                Payment received
              </h1>

              <p className="mt-4 text-base text-white/70">
                Activating your Aurora membership &mdash; this usually takes a few
                seconds.
              </p>

              <div className="mt-8 flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-white/10 border-t-cyan-400" />
              </div>

              {attempts > 7 ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-white/50">
                    Taking longer than expected &mdash; your payment was received and
                    your plan will activate shortly.
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-flex rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(59,130,246,0.3)] transition hover:brightness-110"
                  >
                    Continue to Dashboard
                  </a>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── Inline broker connect for the success page ─── */

function BrokerConnectInline({
  onSkip,
  onConnected,
}: {
  onSkip: () => void;
  onConnected: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "connected" | "failed">("idle");
  const [error, setError] = useState("");

  async function handleConnect() {
    setStatus("saving");
    setError("");

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection.");

      if (data.verified) {
        setStatus("connected");
        setTimeout(onConnected, 1500);
        return;
      }

      const testRes = await fetch("/api/connections/trading212/test", { method: "POST" });
      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error || "Connection test failed.");

      setStatus("connected");
      setTimeout(onConnected, 1500);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Connection failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_28%),radial-gradient(circle_at_right,_rgba(168,85,247,0.12),_transparent_30%),linear-gradient(180deg,_#040816_0%,_#081120_55%,_#050816_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[88vh] max-w-3xl items-center justify-center">
        <div className="w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,18,42,0.98),rgba(4,12,28,0.98))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
            Connect your broker
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Trading 212</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Connect your Trading 212 account to unlock portfolio tracking, live positions and performance overlays.
          </p>

          {status === "connected" ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="text-sm font-medium text-emerald-200">Connected successfully</span>
              </div>
              <div className="flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">API Key</label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Paste your Trading 212 API key"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">API Secret (optional)</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Paste your Trading 212 API secret"
                />
              </div>

              {status === "failed" && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                  {error || "Connection failed"}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={!apiKey.trim() || status === "saving"}
                  className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
                >
                  {status === "saving" ? "Connecting..." : "Connect"}
                </button>
                <button
                  onClick={onSkip}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
