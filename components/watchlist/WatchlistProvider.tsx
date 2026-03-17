"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addWatchlistItem,
  getWatchlistItems,
  removeWatchlistItem,
} from "@/aurora-app/app/actions/watchlist";

type WatchlistItem = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  created_at?: string | null;
  source?: string | null;
};

type ToggleResult = {
  ok: boolean;
  action?: "added" | "removed";
  error?: string;
};

type WatchlistContextType = {
  items: WatchlistItem[];
  tickers: string[];
  loading: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  hasTicker: (ticker?: string | null) => boolean;
  toggleTicker: (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ) => Promise<ToggleResult>;
};

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

function normaliseTicker(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getWatchlistItems();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Watchlist refresh failed:", error);
      setItems([]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tickers = useMemo(() => {
    return items.map((item) => normaliseTicker(item.symbol)).filter(Boolean);
  }, [items]);

  const hasTicker = useCallback(
    (ticker?: string | null) => {
      const clean = normaliseTicker(ticker);
      if (!clean) return false;
      return tickers.includes(clean);
    },
    [tickers]
  );

  const toggleTicker = useCallback(
    async (
      ticker?: string | null,
      companyName?: string | null,
      source?: string | null
    ): Promise<ToggleResult> => {
      const cleanTicker = normaliseTicker(ticker);

      if (!cleanTicker) {
        return { ok: false, error: "Ticker is required" };
      }

      const exists = tickers.includes(cleanTicker);

      if (exists) {
        const result = await removeWatchlistItem(cleanTicker);

        if (!result?.ok) {
          console.error("removeWatchlistItem failed:", result);
          return { ok: false, error: result?.error || "Remove failed" };
        }

        setItems((prev) =>
          prev.filter((item) => normaliseTicker(item.symbol) !== cleanTicker)
        );

        return { ok: true, action: "removed" };
      }

      const result = await addWatchlistItem({
        symbol: cleanTicker,
        company_name: companyName ?? null,
        source: source ?? null,
      });

      if (!result?.ok) {
        console.error("addWatchlistItem failed:", result);
        return { ok: false, error: result?.error || "Add failed" };
      }

      if (result.item) {
        setItems((prev) => {
          const withoutOld = prev.filter(
            (item) => normaliseTicker(item.symbol) !== cleanTicker
          );
          return [result.item, ...withoutOld];
        });
      } else {
        await refresh();
      }

      return { ok: true, action: "added" };
    },
    [tickers, refresh]
  );

  return (
    <WatchlistContext.Provider
      value={{
        items,
        tickers,
        loading,
        ready,
        refresh,
        hasTicker,
        toggleTicker,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);

  if (!context) {
    throw new Error("useWatchlist must be used inside WatchlistProvider");
  }

  return context;
}
