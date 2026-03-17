"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type WatchlistItem = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};

type WatchlistContextValue = {
  items: WatchlistItem[];
  tickers: string[];
  loading: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  hasTicker: (ticker?: string | null) => boolean;
  toggleTicker: (
    ticker?: string | null,
    companyName?: string | null
  ) => Promise<{
    ok: boolean;
    active?: boolean;
    error?: string;
  }>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function normaliseTicker(input?: string | null) {
  return String(input || "").trim().toUpperCase();
}

function emitToast(
  title: string,
  description?: string,
  tone: "success" | "error" | "info" = "info"
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("aurora:toast", {
      detail: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        description,
        tone,
      },
    })
  );
}

function emitWatchlistSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aurora:watchlist-sync"));
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        setReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("watchlist_items")
        .select("id, symbol, company_name, user_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("WatchlistProvider refresh error:", error);
        setItems([]);
      } else {
        setItems(
          (data || []).map((row) => ({
            ...row,
            symbol: normaliseTicker(row.symbol),
          }))
        );
      }

      setReady(true);
    } catch (error) {
      console.error("WatchlistProvider unexpected refresh error:", error);
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
    if (typeof window === "undefined") return;

    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onLocalSync = () => refresh();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("aurora:watchlist-sync", onLocalSync);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("aurora:watchlist-sync", onLocalSync);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("aurora-watchlist");
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event?.data?.type === "watchlist-sync") {
        refresh();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [refresh]);

  const tickers = useMemo(
    () => Array.from(new Set(items.map((item) => normaliseTicker(item.symbol)).filter(Boolean))),
    [items]
  );

  const hasTicker = useCallback(
    (ticker?: string | null) => tickers.includes(normaliseTicker(ticker)),
    [tickers]
  );

  const toggleTicker = useCallback(
    async (tickerInput?: string | null, companyName?: string | null) => {
      const symbol = normaliseTicker(tickerInput);

      if (!symbol) {
        return { ok: false, error: "Missing symbol" };
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("toggleTicker auth error:", userError);
          return { ok: false, error: userError.message };
        }

        if (!user) {
          return { ok: false, error: "You must be signed in to use the watchlist." };
        }

        const currentlyActive = tickers.includes(symbol);

        if (currentlyActive) {
          const previousItems = items;
          setItems((prev) => prev.filter((item) => normaliseTicker(item.symbol) !== symbol));

          const { error } = await supabase
            .from("watchlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("symbol", symbol);

          if (error) {
            console.error("toggleTicker remove error:", error);
            setItems(previousItems);
            return { ok: false, error: error.message };
          }

          emitWatchlistSync();
          channelRef.current?.postMessage({ type: "watchlist-sync" });

          return { ok: true, active: false };
        }

        const optimisticItem: WatchlistItem = {
          symbol,
          company_name: companyName || null,
          user_id: user.id,
          created_at: new Date().toISOString(),
        };

        const previousItems = items;
        setItems((prev) => [
          optimisticItem,
          ...prev.filter((item) => normaliseTicker(item.symbol) !== symbol),
        ]);

        const { data, error } = await supabase
          .from("watchlist_items")
          .insert({
            user_id: user.id,
            symbol,
            company_name: companyName || null,
          })
          .select("id, symbol, company_name, user_id, created_at, updated_at")
          .single();

        if (error) {
          console.error("toggleTicker add error:", error);
          setItems(previousItems);
          return { ok: false, error: error.message };
        }

        if (data) {
          setItems((prev) => [
            {
              ...data,
              symbol: normaliseTicker(data.symbol),
            },
            ...prev.filter((item) => normaliseTicker(item.symbol) !== symbol),
          ]);
        }

        emitWatchlistSync();
        channelRef.current?.postMessage({ type: "watchlist-sync" });

        return { ok: true, active: true };
      } catch (error) {
        console.error("toggleTicker unexpected error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Watchlist update failed",
        };
      }
    },
    [items, supabase, tickers]
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      items,
      tickers,
      loading,
      ready,
      refresh,
      hasTicker,
      toggleTicker,
    }),
    [items, tickers, loading, ready, refresh, hasTicker, toggleTicker]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used inside WatchlistProvider");
  }
  return ctx;
}

export { emitToast };
