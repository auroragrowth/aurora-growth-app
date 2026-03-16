"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";

export default function WatchlistStar({
  ticker,
  className = "",
}: {
  ticker?: string | null;
  className?: string;
}) {
  const { isInWatchlist, toggleWatchlist, ready } = useWatchlist();
  const [saving, setSaving] = useState(false);

  const active = isInWatchlist(ticker);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
      disabled={!ready || saving}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          setSaving(true);
          await toggleWatchlist(ticker);
        } catch (err: any) {
          console.error("Watchlist toggle failed:", err);
          alert(err?.message || "Watchlist save failed");
        } finally {
          setSaving(false);
        }
      }}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        active
          ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
          : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white",
        !ready || saving ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      <Star className="h-4 w-4" fill={active ? "currentColor" : "none"} />
    </button>
  );
}
