"use client";

import { useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type Props = {
  ticker?: string | null;
  company?: string | null;
  source?: string | null;
  className?: string;
};

export default function WatchlistStar({
  ticker,
  company,
  source,
  className = "",
}: Props) {
  const { hasTicker, toggleTicker } = useWatchlist();
  const [busy, setBusy] = useState(false);

  const cleanTicker = String(ticker ?? "").trim().toUpperCase();
  const active = hasTicker(cleanTicker);

  async function onClick() {
    if (!cleanTicker || busy) return;

    try {
      setBusy(true);
      await toggleTicker(cleanTicker, company ?? null, source ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || !cleanTicker}
      className={className}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
