"use client";

import { useState } from "react";

type Props = {
  plan: string;
  buttonText: string;
  isCurrent: boolean;
  hasPortal: boolean;
};

export default function UpgradeButtons({
  plan,
  buttonText,
  isCurrent,
  hasPortal,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to start checkout");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong starting checkout.");
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      setPortalLoading(true);

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to open billing portal");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong opening the billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startCheckout}
        disabled={isCurrent || loading}
        className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isCurrent
            ? "cursor-not-allowed border border-white/10 bg-white/10 text-white/40"
            : "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95"
        }`}
      >
        {isCurrent ? "Current Plan" : loading ? "Redirecting..." : buttonText}
      </button>

      {hasPortal && (
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          {portalLoading ? "Opening..." : "Manage Billing"}
        </button>
      )}
    </div>
  );
}
