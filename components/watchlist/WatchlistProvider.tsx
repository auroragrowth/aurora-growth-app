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
import { createClient } from "@/lib/supabase/client";

export type WatchlistItem = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  source?: string | null;
  created_at?: string | null;
};

type ToggleResult = {
  ok: boolean;
  active: boolean;
};

type WatchlistContextType = {
  items: WatchlistItem[];
  tickers: string[];
  ready: boolean;
  loading: boolean;
  isGuestMode: boolean;
  hasTicker: (ticker?: string | null) => boolean;
  refresh: () => Promise<void>;
  toggleTicker: (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ) => Promise<ToggleResult>;
};

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const GUEST_KEY = "aurora_guest_watchlist";

function normalizeTicker(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function readGuestWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        symbol: normalizeTicker(item?.symbol),
        company_name: item?.company_name || null,
      }))
      .filter((item) => item.symbol);
  } catch {
    return [];
  }
}

function writeGuestWatchlist(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_KEY, JSON.stringify(items));
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const guestItems = readGuestWatchlist();
        setItems(guestItems);
        setIsGuestMode(true);
        setReady(true);
        return;
      }

      // Use the API route which reads from the correct broker-mode table
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      const json = await res.json();

      if (json?.items && Array.isArray(json.items)) {
        setItems(
          json.items.map((row: any) => ({
            id: row.id,
            symbol: normalizeTicker(row.symbol),
            company_name: row.company_name || null,
            source: row.source || null,
            created_at: row.created_at || null,
          }))
        );
      } else {
        setItems([]);
      }

      setIsGuestMode(false);
      setReady(true);
    } catch (error) {
      console.error("Watchlist refresh error:", error);
      setItems([]);
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refresh]);

  // Listen for broker mode changes to re-fetch watchlist
  useEffect(() => {
    function handleModeChange() {
      refresh();
    }
    window.addEventListener("aurora:broker-mode-changed", handleModeChange);
    return () => window.removeEventListener("aurora:broker-mode-changed", handleModeChange);
  }, [refresh]);

  const toggleTicker = useCallback(
    async (ticker?: string | null, companyName?: string | null, source?: string | null) => {
      const symbol = normalizeTicker(ticker);
      if (!symbol) return { ok: false, active: false };

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const current = readGuestWatchlist();
        const exists = current.some((item) => item.symbol === symbol);

        const next = exists
          ? current.filter((item) => item.symbol !== symbol)
          : [{ symbol, company_name: companyName || null, source: source || null }, ...current];

        writeGuestWatchlist(next);
        setItems(next);
        setIsGuestMode(true);

        return { ok: true, active: !exists };
      }

      // Use the toggle API route which writes to the correct broker-mode table
      try {
        const res = await fetch("/api/watchlist/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            company_name: companyName || null,
            source: source || null,
          }),
        });

        const data = await res.json();

        if (!data?.ok) {
          console.error("Failed to toggle watchlist:", data?.error);
          return { ok: false, active: false };
        }

        // Optimistic update
        if (data.added) {
          setItems((prev) => [
            { symbol, company_name: companyName || null, source: source || null },
            ...prev,
          ]);
        } else {
          setItems((prev) => prev.filter((item) => item.symbol !== symbol));
        }

        // Toast feedback showing which list was updated
        const isDemo = data.mode === "demo";
        window.dispatchEvent(
          new CustomEvent("aurora:toast", {
            detail: {
              id: `wl-${symbol}-${Date.now()}`,
              title: data.added
                ? `${symbol} added to ${isDemo ? "Demo" : "Live"} Watchlist`
                : `${symbol} removed from ${isDemo ? "Demo" : "Live"} Watchlist`,
              tone: data.added ? (isDemo ? "info" : "success") : "info",
            },
          })
        );

        return { ok: true, active: !!data.added };
      } catch (error) {
        console.error("Toggle watchlist error:", error);
        return { ok: false, active: false };
      }
    },
    [supabase]
  );

  const tickers = useMemo(() => items.map((item) => item.symbol), [items]);

  const hasTicker = useCallback(
    (ticker?: string | null) => tickers.includes(normalizeTicker(ticker)),
    [tickers]
  );

  const value = useMemo<WatchlistContextType>(
    () => ({
      items,
      tickers,
      ready,
      loading,
      isGuestMode,
      refresh,
      hasTicker,
      toggleTicker,
    }),
    [items, tickers, ready, loading, isGuestMode, refresh, hasTicker, toggleTicker]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);

  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }

  return context;
}
