"use client";

import { useCallback, useState } from "react";
import { RotateCcw } from "lucide-react";

export default function RestartTourButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const restart = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_tour_completed: false }),
      });

      localStorage.removeItem("aurora_tour_completed");
      localStorage.setItem("aurora_tour_step", "0");

      setDone(true);

      // Dispatch event so OnboardingTour picks it up without a page reload
      window.dispatchEvent(new CustomEvent("aurora:restart-tour"));
    } catch {
      // best effort
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={restart}
      disabled={loading || done}
      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/14 hover:border-cyan-400/30 disabled:opacity-50"
    >
      <RotateCcw className="h-4 w-4" />
      {done ? "Tour restarted — scroll up" : loading ? "Restarting..." : "Restart Aurora tour"}
    </button>
  );
}
