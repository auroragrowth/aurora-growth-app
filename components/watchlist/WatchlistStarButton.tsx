"use client";

import { useState } from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

type Props = {
  ticker?: string | null;
  companyName?: string | null;
  source?: string | null;
  className?: string;
};

export default function WatchlistStarButton({
  ticker,
  companyName,
  source,
  className = "",
}: Props) {
  const { hasTicker, toggleTicker } = useWatchlist();
  const [busy, setBusy] = useState(false);

  const cleanTicker = String(ticker ?? "").trim().toUpperCase();
  const active = hasTicker(cleanTicker);

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!cleanTicker || busy) return;

    try {
      setBusy(true);

      const result = await toggleTicker(
        cleanTicker,
        companyName ?? null,
        source ?? null
      );

      if (!result?.ok) {
        alert(result?.error || "Watchlist update failed");
      }
    } catch (error: any) {
      console.error("watchlist star click failed:", error);
      alert(error?.message || "Watchlist update failed");
    } finally {
      setBusy(false);
    }
  }

  const baseClasses =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border transition duration-200";

  const stateClasses = active
    ? "border-cyan-300 bg-cyan-400/20 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.22)]"
    : "border-cyan-400/30 bg-cyan-500/8 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-300/50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || !cleanTicker}
      className={`${baseClasses} ${stateClasses} ${busy ? "opacity-70" : ""} ${className}`}
      title={
        active ? "Remove from Watchlist" : "Add to Watchlist"
      }
      aria-label={
        active ? "Remove from Watchlist" : "Add to Watchlist"
      }
    >
      <span className="text-lg leading-none">
        {busy ? "…" : "★"}
      </span>
    </button>
  );
}
