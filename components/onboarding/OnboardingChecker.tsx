"use client";

import { useEffect, useState } from "react";
type OnboardingState = {
  onboarding_step: string | null;
  trading212_connected: boolean;
  has_completed_onboarding: boolean;
  subscription_status: string | null;
  plan: string | null;
  plan_key: string | null;
};

export default function OnboardingChecker() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setState(data);
      })
      .catch(() => {});
  }, []);

  if (!state || dismissed) return null;

  // Show Trading 212 popup once, immediately after checkout
  const showT212Popup = state.onboarding_step === "checkout_complete";

  // Show reminder card when user has been through checkout but never connected
  const showReminderCard =
    !showT212Popup &&
    !state.trading212_connected &&
    !state.has_completed_onboarding &&
    (state.subscription_status === "active" ||
      state.subscription_status === "trialing");

  if (showT212Popup) {
    // Redirect to connections page instead of showing old popup
    window.location.href = "/dashboard/connections";
    return null;
  }

  if (showReminderCard) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-full max-w-sm rounded-[24px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(4,21,45,0.97),rgba(2,14,31,0.97))] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Connect your broker
            </p>
            <p className="mt-1.5 text-sm font-medium text-white">
              Link Trading 212 to see live portfolio data
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Takes under a minute. You can skip any time.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-full p-1 text-slate-500 transition hover:text-slate-300"
            aria-label="Dismiss"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <a
          href="/dashboard/connections"
          className="mt-4 block rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_100%)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-110"
        >
          Connect Trading 212
        </a>
      </div>
    );
  }

  return null;
}
