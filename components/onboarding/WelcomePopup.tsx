"use client";

import { useState } from "react";

type Props = {
  onDismiss: () => void;
};

export default function WelcomePopup({ onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  async function dismiss() {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          has_seen_welcome_popup: true,
          has_seen_plan_selection: true,
          onboarding_step: "plan_selection",
        }),
      });
    } catch {
      // Non-fatal — proceed regardless
    }
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.98))] p-8 shadow-[0_0_120px_rgba(34,211,238,0.12),0_0_0_1px_rgba(34,211,238,0.05)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-300/80">
          Aurora Growth
        </p>

        <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
          Welcome to Aurora
        </h2>

        <p className="mt-4 text-base leading-7 text-slate-300">
          Aurora is a premium investment platform for growth investors. Connect
          your Trading 212 account, analyse stocks, and track your portfolio —
          all in one place.
        </p>

        <div className="mt-6 space-y-3">
          {[
            ["Choose your plan", "Core, Pro, or Elite — cancel any time"],
            [
              "Connect Trading 212",
              "Link your paper or live account securely",
            ],
            [
              "Start exploring",
              "Scanner, watchlists, analytics — unlocked instantly",
            ],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <div className="text-sm">
                <span className="font-medium text-white">{title}</span>
                <span className="ml-2 text-slate-400">{desc}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          disabled={loading}
          className="mt-8 w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(59,130,246,0.35)] transition hover:brightness-110 disabled:opacity-60"
        >
          Choose my plan
        </button>
      </div>
    </div>
  );
}
