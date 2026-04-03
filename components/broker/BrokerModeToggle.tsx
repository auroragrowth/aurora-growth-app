"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  initialMode: "live" | "demo";
  compact?: boolean;
  onModeChange?: (mode: "live" | "demo") => void;
};

export default function BrokerModeToggle({ initialMode, compact, onModeChange }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [switching, setSwitching] = useState(false);

  // Sync with parent when initialMode changes (e.g. after PortfolioProvider loads)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const toggle = useCallback(async (next: "live" | "demo") => {
    if (next === mode || switching) return;
    setSwitching(true);
    try {
      await fetch("/api/broker/set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
    } catch (e) {
      console.error("Toggle error:", e);
    }
    // Always hard reload regardless of API result
    // This forces server components to re-fetch with new mode
    window.location.href = window.location.href;
  }, [mode, switching, onModeChange]);

  const isLive = mode === "live";

  if (compact) {
    return (
      <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => toggle("live")}
          disabled={switching}
          className={`rounded-full px-2.5 py-1 transition ${
            isLive
              ? "bg-emerald-400/15 text-emerald-300"
              : "text-slate-500 hover:text-white/70"
          }`}
        >
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400" : "bg-slate-600"}`} />
          LIVE
        </button>
        <button
          type="button"
          onClick={() => toggle("demo")}
          disabled={switching}
          className={`rounded-full px-2.5 py-1 transition ${
            !isLive
              ? "bg-amber-400/15 text-amber-300"
              : "text-slate-500 hover:text-white/70"
          }`}
        >
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${!isLive ? "bg-amber-400" : "bg-slate-600"}`} />
          DEMO
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 transition ${
      isLive
        ? "border-emerald-400/20 bg-emerald-400/5"
        : "border-amber-400/20 border-dashed bg-amber-400/5"
    }`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Mode</div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => toggle("live")}
          disabled={switching}
          className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            isLive
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
          }`}
        >
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isLive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-slate-600"}`} />
          Live Account
        </button>
        <button
          type="button"
          onClick={() => toggle("demo")}
          disabled={switching}
          className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            !isLive
              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
          }`}
        >
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${!isLive ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]" : "bg-slate-600"}`} />
          Demo Account
        </button>
      </div>
      {!isLive && (
        <div className="mt-2 text-center text-xs text-amber-400/70">
          Practice mode — no real money involved
        </div>
      )}
    </div>
  );
}
