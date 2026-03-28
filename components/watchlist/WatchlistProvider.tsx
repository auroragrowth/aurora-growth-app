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

      const { data, error } = await supabase
        .from("watchlist_items")
        .select("id,symbol,company_name,source,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load watchlist:", error);
        setItems([]);
      } else {
        setItems(
          (data || []).map((row) => ({
            id: row.id,
            symbol: normalizeTicker(row.symbol),
            company_name: row.company_name || null,
            source: (row as any).source || null,
            created_at: row.created_at || null,
          }))
        );
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

      const existing = items.find((item) => item.symbol === symbol);

      if (existing?.id) {
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Failed removing watchlist item:", error);
          return { ok: false, active: true };
        }

        const next = items.filter((item) => item.symbol !== symbol);
        setItems(next);
        return { ok: true, active: false };
      }

      const { data, error } = await supabase
        .from("watchlist_items")
        .insert({
          symbol,
          company_name: companyName || null,
          source: source || null,
        })
        .select("id,symbol,company_name,source,created_at")
        .single();

      if (error) {
        console.error("Failed adding watchlist item:", error);
        return { ok: false, active: false };
      }

      const next = [
        {
          id: data.id,
          symbol: normalizeTicker(data.symbol),
          company_name: data.company_name || null,
          source: (data as any).source || null,
          created_at: data.created_at || null,
        },
        ...items,
      ];

      setItems(next);
      setIsGuestMode(false);
      return { ok: true, active: true };
    },
    [items, supabase]
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
