"use client";

import { useEffect, useState } from "react";

type TradingMode = "paper" | "live";
type ConnectionStatus = "idle" | "saving" | "testing" | "connected" | "failed";

export default function BrokerConnectModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<TradingMode>("paper");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkConnections() {
      try {
        const res = await fetch("/api/connections/trading212", { cache: "no-store" });
        const data = await res.json();
        const connections = data.connections || [];
        if (connections.length === 0) {
          setOpen(true);
        }
      } catch {
        // If we can't check, don't block the user
      }
    }
    checkConnections();
  }, []);

  async function handleConnect() {
    setStatus("saving");
    setError("");

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, apiKey, apiSecret }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection.");

      setStatus("testing");

      const testRes = await fetch("/api/connections/trading212/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error || "Connection test failed.");

      setStatus("connected");
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Connection failed.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,18,42,0.98),rgba(4,12,28,0.98))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-5 top-5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
          Connect your broker
        </div>

        <h2 className="mt-3 text-2xl font-semibold text-white">
          Trading 212
        </h2>

        <p className="mt-2 text-sm leading-7 text-slate-300">
          Connect your broker to unlock portfolio tracking, live positions and trade execution.
        </p>

        {status === "connected" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4">
              <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-sm font-medium text-emerald-200">Connected successfully</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-medium text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:brightness-110"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="mt-6 flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    s <= step ? "bg-cyan-400" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {step === 1 && (
              <div className="mt-6 space-y-4">
                <div className="text-sm font-medium text-slate-200">Select environment</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("paper")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      mode === "paper"
                        ? "border-amber-400/30 bg-amber-300/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="text-base font-semibold">Paper</div>
                    <div className="mt-1 text-xs text-slate-400">Safe testing</div>
                  </button>
                  <button
                    onClick={() => setMode("live")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      mode === "live"
                        ? "border-emerald-400/30 bg-emerald-300/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="text-base font-semibold">Live</div>
                    <div className="mt-1 text-xs text-slate-400">Real money</div>
                  </button>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">API Key</label>
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                    placeholder="Paste Trading 212 API key"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">API Secret</label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                    placeholder="Paste Trading 212 API secret"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setStep(3); handleConnect(); }}
                    disabled={!apiKey.trim()}
                    className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-6 space-y-4">
                {status === "saving" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    <span className="text-sm font-medium text-amber-200">Saving credentials...</span>
                  </div>
                )}
                {status === "testing" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    <span className="text-sm font-medium text-amber-200">Testing connection...</span>
                  </div>
                )}
                {status === "failed" && (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4">
                      <span className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]" />
                      <span className="text-sm font-medium text-red-200">{error || "Connection failed"}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setStep(2); setStatus("idle"); setError(""); }}
                        className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]"
                      >
                        Try again
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Skip for now
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step !== 3 && (
              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full text-center text-sm text-slate-400 transition hover:text-white"
              >
                Skip for now
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
