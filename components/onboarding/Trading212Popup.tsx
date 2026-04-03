"use client";

import { useState } from "react";
import ConnectionGuideModal from "@/components/broker/ConnectionGuideModal";

type Props = {
  onDone: () => void;
};

type Step = "connect" | "success";

export default function Trading212Popup({ onDone }: Props) {
  const [step, setStep] = useState<Step>("connect");
  const [mode, setMode] = useState<"paper" | "live">("live");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

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
    if (!apiKey.trim()) {
      setError("API key is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, apiKey, apiSecret: "" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not connect Trading 212.");
      }

      await markComplete({ connected: true, tradingMode: mode });
      setStep("success");
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.98))] p-8 shadow-[0_0_120px_rgba(34,211,238,0.12),0_0_0_1px_rgba(34,211,238,0.05)] md:p-10">

          {step === "connect" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-300/80">
                Connect your broker
              </p>

              <h2 className="mt-4 text-2xl font-bold text-white">
                Connect Trading 212
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                Connect your Trading 212 account to unlock portfolio tracking, live positions and trade execution.
              </p>

              <div className="mt-5">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
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
                  <button
                    type="button"
                    onClick={() => setMode("paper")}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      mode === "paper"
                        ? "bg-amber-400 text-slate-900"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Practice
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

                {error && (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                )}
              </div>

              {/* How to connect guide */}
              <button
                onClick={() => setShowGuide(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10"
              >
                <span>&#128214;</span>
                How to get your API key &mdash; step-by-step guide
              </button>

              <div className="mt-5">
                <button
                  onClick={handleConnect}
                  disabled={loading || !apiKey.trim()}
                  className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Connecting..." : "Connect Trading 212"}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-white/30">
                You can connect anytime from the Connections page
              </p>
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
                Your {mode === "paper" ? "practice" : "live"} account is now linked.
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

      {showGuide && <ConnectionGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}
