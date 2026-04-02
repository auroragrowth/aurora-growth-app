"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const QUOTES = [
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
  },
  {
    text: "In investing, what is comfortable is rarely profitable.",
    author: "Robert Arnott",
  },
  {
    text: "Know what you own, and know why you own it.",
    author: "Peter Lynch",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
];

type Props = {
  firstName: string;
};

export default function WelcomeModal({ firstName }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  useEffect(() => {
    // localStorage is the PRIMARY gate — checked BEFORE any API calls
    if (
      localStorage.getItem("aurora_tour_done") === "true" ||
      localStorage.getItem("aurora_all_popups_done") === "true"
    ) {
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const hasPlan = data.has_completed_plan_selection === true;
        const brokerConnected = data.trading212_connected === true;
        const notSeenYet = data.has_seen_welcome !== true;

        if (!cancelled && hasPlan && brokerConnected && notSeenYet) {
          setVisible(true);
        }
      } catch {
        // silent
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss() {
    setDismissing(true);
    localStorage.setItem("aurora_tour_done", "true");
    localStorage.setItem("aurora_all_popups_done", "true");
    try {
      await fetch("/api/onboarding/welcome-seen", { method: "POST" });
    } catch {
      // best-effort
    }
    setVisible(false);
    router.push("/dashboard/market-scanner");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.98))] p-8 shadow-[0_0_120px_rgba(34,211,238,0.12)] md:p-10">
        <button
          onClick={dismiss}
          disabled={dismissing}
          className="absolute right-5 top-5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/30">
            <span className="text-2xl">✦</span>
          </div>

          <h2 className="mt-5 text-2xl font-bold text-white md:text-3xl">
            Welcome to Aurora Growth
          </h2>

          <p className="mt-3 text-base text-slate-300">
            {firstName}, you are all set and ready to go.
          </p>
        </div>

        {/* Quote */}
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
          <p className="text-sm italic leading-6 text-slate-300">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="mt-2 text-xs text-slate-500">&mdash; {quote.author}</p>
        </div>

        {/* Ready checklist */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Your Aurora is ready
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-emerald-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-xs">&#10003;</span>
              Plan active
            </div>
            <div className="flex items-center gap-2.5 text-sm text-emerald-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-xs">&#10003;</span>
              Broker connected
            </div>
            <div className="flex items-center gap-2.5 text-sm text-emerald-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-xs">&#10003;</span>
              Alerts available
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* What to do first */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          What to do first
        </p>
        <div className="mt-3 space-y-2.5">
          {[
            { n: "1", title: "Run the scanner", desc: "Find high-conviction opportunities" },
            { n: "2", title: "Add stocks to your watchlist", desc: "Track the ones that interest you" },
            { n: "3", title: "Build your first ladder", desc: "Calculate staged entry levels" },
            { n: "4", title: "Set a price alert", desc: "Get notified via Telegram" },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">
                {step.n}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{step.title}</div>
                <div className="text-xs text-slate-400">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          disabled={dismissing}
          className="mt-7 flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(59,130,246,0.35)] transition hover:brightness-110 disabled:opacity-50"
        >
          {dismissing ? "Loading..." : "Start exploring Aurora \u2192"}
        </button>
      </div>
    </div>
  );
}
