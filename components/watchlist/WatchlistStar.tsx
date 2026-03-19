"use client";

import { useMemo, useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type WatchlistStarProps = {
  ticker?: string | null;
  company?: string | null;
  source?: string | null;
  className?: string;
};

function normalizeTicker(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

export default function WatchlistStar({
  ticker,
  company,
  className = "",
}: WatchlistStarProps) {
  const { hasTicker, toggleTicker, ready } = useWatchlist();
  const [busy, setBusy] = useState(false);

  const cleanTicker = useMemo(() => normalizeTicker(ticker), [ticker]);
  const active = ready && cleanTicker ? hasTicker(cleanTicker) : false;

  async function handleClick() {
    if (!cleanTicker || busy) return;

    try {
      setBusy(true);
      await toggleTicker(cleanTicker, company ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!cleanTicker || busy}
      aria-label={
        active
          ? `Remove ${cleanTicker} from watchlist`
          : `Add ${cleanTicker} to watchlist`
      }
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ${
        active
          ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-200"
      } ${busy ? "opacity-70" : ""} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.73L18.18 21z" />
      </svg>
    </button>
  );
}
