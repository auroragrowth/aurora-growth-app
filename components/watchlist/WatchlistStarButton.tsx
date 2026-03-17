"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { addToWatchlist, removeFromWatchlist } from "@/app/actions/watchlist";

type Props = {
  ticker?: string | null;
  initialActive?: boolean;
  className?: string;
};

function normaliseTicker(input?: string | null) {
  return String(input || "").trim().toUpperCase();
}

export default function WatchlistStarButton({
  ticker,
  initialActive = false,
  className = "",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState(initialActive);

  const cleanTicker = useMemo(() => normaliseTicker(ticker), [ticker]);
  const isDisabled = !cleanTicker;

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive, cleanTicker]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!cleanTicker) {
      window.alert("No ticker found for this row.");
      return;
    }

    if (isPending) return;

    const previous = active;
    setActive(!previous);

    startTransition(async () => {
      const result = previous
        ? await removeFromWatchlist(cleanTicker)
        : await addToWatchlist(cleanTicker);

      if (!result?.ok) {
        setActive(previous);
        window.alert(result?.error || "Failed to update watchlist.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        active
          ? `Remove ${cleanTicker} from watchlist`
          : `Add ${cleanTicker} to watchlist`
      }
      title={
        isDisabled
          ? "Ticker missing"
          : active
          ? `Remove ${cleanTicker} from watchlist`
          : `Add ${cleanTicker} to watchlist`
      }
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200",
        active
          ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <Star
        className={[
          "h-4 w-4 transition-all duration-200",
          active ? "fill-current scale-110" : "",
        ].join(" ")}
      />
    </button>
  );
}
