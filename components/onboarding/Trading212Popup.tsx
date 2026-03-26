"use client";

import { useState } from "react";

type Props = {
  onDone: () => void;
};

type Step = "intro" | "connect" | "success";

export default function Trading212Popup({ onDone }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function markComplete(opts?: {
    connected?: boolean;
    tradingMode?: "paper" | "live";
  }) {
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboarding_step: "completed",
        has_completed_onboarding: true,
        ...(opts?.connected
          ? { trading212_connected: true, trading212_mode: opts.tradingMode }
          : {}),
      }),
    }).catch(() => {});
  }

  async function handleConnect() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError("Both API key and API secret are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, apiKey, apiSecret }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not connect Trading 212.");
      }

      await markComplete({ connected: true, tradingMode: mode });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    await markComplete();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.98))] p-8 shadow-[0_0_120px_rgba(34,211,238,0.12),0_0_0_1px_rgba(34,211,238,0.05)] md:p-10">
        {step === "intro" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-300/80">
              Connect your broker
            </p>

            <h2 className="mt-4 text-3xl font-bold text-white">
              Connect Trading 212
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300">
              Link your Trading 212 account to see your live portfolio, P&L,
              and positions directly inside Aurora.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Credentials are encrypted at rest with AES-256",
                "Paper and live accounts supported separately",
                "Disconnect any time from your dashboard",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep("connect")}
                className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(59,130,246,0.3)] transition hover:brightness-110"
              >
                Connect now
              </button>
              <button
                onClick={handleSkip}
                disabled={loading}
                className="rounded-full border border-white/10 px-6 py-4 text-base font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                {loading ? "..." : "Skip"}
              </button>
            </div>
          </>
        )}

        {step === "connect" && (
          <>
            <button
              onClick={() => {
                setStep("intro");
                setError("");
              }}
              className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            <h2 className="text-2xl font-bold text-white">
              Add API credentials
            </h2>

            <div className="mt-5">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setMode("paper")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    mode === "paper"
                      ? "bg-amber-400 text-slate-900"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Paper
                </button>
                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    mode === "live"
                      ? "bg-emerald-400 text-slate-900"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Live
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Trading 212 API key"
                  className="w-full rounded-full border border-white/10 bg-[#06122b] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  API Secret
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Paste your Trading 212 API secret"
                  className="w-full rounded-full border border-white/10 bg-[#06122b] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Connecting..." : "Connect Trading 212"}
              </button>
              <button
                onClick={handleSkip}
                disabled={loading}
                className="rounded-full border border-white/10 px-5 py-4 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                className="h-7 w-7 text-emerald-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white">
              Trading 212 connected
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-300">
              Your {mode === "paper" ? "paper" : "live"} account is now linked.
              Aurora will sync your portfolio automatically.
            </p>

            <button
              onClick={onDone}
              className="mt-8 w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white transition hover:brightness-110"
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
