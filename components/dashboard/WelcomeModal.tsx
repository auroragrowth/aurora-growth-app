"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function WelcomeModal({ firstName }: { firstName: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        // Show only if user has a plan but hasn't seen this modal
        const hasPlan = ["core", "pro", "elite"].includes(data.plan_key ?? "");
        const seen = data.has_seen_welcome === true;
        if (!cancelled && hasPlan && !seen) {
          setVisible(true);
        }
      } catch {
        // silent
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_seen_welcome: true }),
      });
    } catch {
      // best-effort
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.98))] p-8 shadow-[0_0_120px_rgba(34,211,238,0.12)] md:p-10">
        <button
          onClick={dismiss}
          disabled={dismissing}
          className="absolute right-5 top-5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7 text-emerald-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h2 className="mt-5 text-center text-2xl font-bold text-white md:text-3xl">
          You&apos;re all set, {firstName}!
        </h2>

        <p className="mt-3 text-center text-sm leading-7 text-slate-300">
          Your Aurora scanner, watchlist and calculator are ready.
          Here&apos;s what to do first:
        </p>

        <div className="mt-6 space-y-3">
          {[
            { step: "1", title: "Run the scanner", desc: "Find high-scoring stocks with Aurora analysis", href: "/dashboard/market-scanner" },
            { step: "2", title: "Add stocks to watchlist", desc: "Save names you want to track", href: "/dashboard/watchlist" },
            { step: "3", title: "Use the calculator", desc: "Build your investment ladder plan", href: "/dashboard/investments/calculator" },
            { step: "4", title: "Connect Trading 212", desc: "Link your broker for live portfolio data", href: "/dashboard/connections" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">
                {item.step}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard/market-scanner"
          onClick={dismiss}
          className="mt-8 flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(59,130,246,0.35)] transition hover:brightness-110"
        >
          Start scanning
        </Link>
      </div>
    </div>
  );
}
