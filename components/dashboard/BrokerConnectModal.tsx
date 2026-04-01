"use client";

import { useEffect, useState } from "react";

type ConnectionStatus = "idle" | "saving" | "connected" | "failed";

type Props = {
  onClose?: () => void;
};

export default function BrokerConnectModal({ onClose }: Props) {
  const [hidden, setHidden] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState("");

  // localStorage is the primary gate — survives even if DB save fails
  useEffect(() => {
    if (localStorage.getItem("t212_popup_skip") === "true") {
      setHidden(true);
    }
  }, []);

  function close() {
    onClose?.();
  }

  async function dismissPrompt() {
    close();
    try {
      localStorage.setItem("broker_popup_skipped", "true");
      localStorage.setItem("t212_popup_skip", "true");
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          has_seen_trading212_prompt: true,
          welcome_popup_shown_count: 3,
        }),
      });
    } catch { /* best-effort */ }
  }

  async function handleConnect() {
    setStatus("saving");
    setError("");

    // Step 1: Test the key with a live API call before saving
    try {
      const key = apiKey.trim();
      const secret = apiSecret.trim();
      const authValue = secret
        ? `Basic ${btoa(`${key}:${secret}`)}`
        : key;

      const testBaseUrl = mode === "demo"
        ? "https://demo.trading212.com/api/v0"
        : "https://live.trading212.com/api/v0";

      const testRes = await fetch(`${testBaseUrl}/equity/account/info`, {
        headers: { Authorization: authValue },
      });

      if (testRes.status === 401 || testRes.status === 403) {
        setStatus("failed");
        setError("This key was not accepted by Trading 212. Please check it and try again.");
        return;
      }

      if (!testRes.ok) {
        setStatus("failed");
        setError(`Trading 212 returned an error (${testRes.status}). Please try again.`);
        return;
      }
    } catch {
      // Network error — still try to save, server will verify
    }

    // Step 2: Save to database
    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection.");

      if (data.verified) {
        setStatus("connected");
        window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
        return;
      }

      // Saved but not verified — try explicit test
      const testRes = await fetch("/api/connections/trading212/test", { method: "POST" });
      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error || "Connection test failed.");

      setStatus("connected");
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Connection failed.");
    }
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissPrompt} />

      <div className="relative w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,18,42,0.98),rgba(4,12,28,0.98))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <button
          onClick={dismissPrompt}
          className="absolute right-5 top-5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Connect your broker</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Trading 212</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Connect your Trading 212 account to unlock portfolio tracking, live positions and trade execution.
        </p>

        {status === "connected" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4">
              <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-sm font-medium text-emerald-200">Connected ✓</span>
            </div>
            <button
              onClick={close}
              className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-medium text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:brightness-110"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("live")}
                className={`flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "live"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${mode === "live" ? "bg-emerald-400" : "bg-slate-600"}`} />
                Live Account
              </button>
              <button
                type="button"
                onClick={() => setMode("demo")}
                className={`flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "demo"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${mode === "demo" ? "bg-amber-400" : "bg-slate-600"}`} />
                Practice
              </button>
            </div>

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
              <label className="mb-2 block text-sm font-medium text-slate-300">API Secret</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                placeholder="Paste your Trading 212 API secret"
              />
            </div>

            <p className="text-xs text-slate-500">
              Generate both your API Key and API Secret from your broker account Settings &rarr; API page.
            </p>

            {status === "failed" && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {error || "Connection failed"}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={!apiKey.trim() || !apiSecret.trim() || status === "saving"}
                className="flex-1 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {status === "saving" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Testing & connecting...
                  </span>
                ) : "Connect"}
              </button>
              <button
                onClick={dismissPrompt}
                className="flex-1 rounded-full border border-white/20 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Skip for now
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-white/40">
              You can connect anytime from the Connections page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
