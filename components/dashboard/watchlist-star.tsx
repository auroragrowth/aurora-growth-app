"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { emitToast, useWatchlist } from "@/components/watchlist/WatchlistProvider";

type Props = {
  ticker?: string | null;
  company?: string | null;
  className?: string;
};

function normaliseTicker(input?: string | null) {
  return String(input || "").trim().toUpperCase();
}

export default function WatchlistStar({
  ticker,
  company,
  className = "",
}: Props) {
  const router = useRouter();
  const { hasTicker, toggleTicker } = useWatchlist();
  const [isPending, startTransition] = useTransition();
  const [burst, setBurst] = useState(false);

  const cleanTicker = useMemo(() => normaliseTicker(ticker), [ticker]);
  const active = hasTicker(cleanTicker);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setBurst(false), 380);
    setBurst(true);
    return () => window.clearTimeout(timer);
  }, [active]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!cleanTicker || isPending) return;

    startTransition(async () => {
      const result = await toggleTicker(cleanTicker, company || null);

      if (!result.ok) {
        emitToast("Watchlist update failed", result.error || "Please try again.", "error");
        return;
      }

      if (result.active) {
        emitToast(
          `${cleanTicker} added`,
          company ? `${company} is now in your watchlist.` : "Added to your watchlist.",
          "success"
        );
      } else {
        emitToast(
          `${cleanTicker} removed`,
          company ? `${company} was removed from your watchlist.` : "Removed from your watchlist.",
          "info"
        );
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!cleanTicker || isPending}
      aria-label={
        active
          ? `Remove ${cleanTicker} from watchlist`
          : `Add ${cleanTicker} to watchlist`
      }
      title={
        !cleanTicker
          ? "Ticker missing"
          : active
            ? `Remove ${cleanTicker}${company ? ` (${company})` : ""} from watchlist`
            : `Add ${cleanTicker}${company ? ` (${company})` : ""} to watchlist`
      }
      className={[
        "group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-all duration-200",
        active
          ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300",
        !cleanTicker || isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:scale-[1.04] active:scale-95",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
          active ? "opacity-100 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_65%)]" : "opacity-0",
          burst ? "animate-ping" : "",
        ].join(" ")}
      />
      <Star
        className={[
          "relative z-10 h-4 w-4 transition-all duration-200",
          active ? "fill-current scale-110" : "",
          isPending ? "animate-pulse" : "",
        ].join(" ")}
      />
    </button>
  );
}
