"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  addWatchlistItem,
  getWatchlistItems,
  removeWatchlistItem,
} from "@/app/actions/watchlist";

type WatchlistItem = {
  id?: string;
  symbol: string;
  company_name?: string | null;
  created_at?: string | null;
  source_list?: string | null;
};

type ActionResult = {
  ok: boolean;
  error?: string;
};

type ToggleResult = {
  ok: boolean;
  added?: boolean;
  removed?: boolean;
  error?: string;
};

type WatchlistContextType = {
  items: WatchlistItem[];
  tickers: string[];
  loading: boolean;
  ready: boolean;
  hasTicker: (ticker?: string | null) => boolean;
  add: (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ) => Promise<ActionResult>;
  remove: (ticker?: string | null) => Promise<ActionResult>;
  toggle: (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ) => Promise<ActionResult>;
  toggleTicker: (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ) => Promise<ToggleResult>;
  refresh: () => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

function normalise(t?: string | null) {
  return (t || "").trim().toUpperCase();
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const tickers = items.map((i) => normalise(i.symbol));

  const hasTicker = (ticker?: string | null) => {
    const t = normalise(ticker);
    return tickers.includes(t);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getWatchlistItems();
      setItems(data || []);
    } catch (err) {
      console.error("Watchlist refresh failed:", err);
    } finally {
      setLoading(false);
      setReady(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const add = async (
    ticker?: string | null,
    companyName?: string | null,
    _source?: string | null
  ): Promise<ActionResult> => {
    const t = normalise(ticker);
    if (!t) return { ok: false, error: "Missing ticker" };

    const result = await addWatchlistItem(t, companyName);

    if (!result.ok) {
      console.error("addWatchlistItem failed:", result);
      return { ok: false, error: result.message || "Add failed" };
    }

    await refresh();
    return { ok: true };
  };

  const remove = async (ticker?: string | null): Promise<ActionResult> => {
    const t = normalise(ticker);
    if (!t) return { ok: false, error: "Missing ticker" };

    const result = await removeWatchlistItem(t);

    if (!result.ok) {
      console.error("removeWatchlistItem failed:", result);
      return { ok: false, error: result.message || "Remove failed" };
    }

    await refresh();
    return { ok: true };
  };

  const toggle = async (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ): Promise<ActionResult> => {
    if (hasTicker(ticker)) {
      return remove(ticker);
    }
    return add(ticker, companyName, source);
  };

  const toggleTicker = async (
    ticker?: string | null,
    companyName?: string | null,
    source?: string | null
  ): Promise<ToggleResult> => {
    if (hasTicker(ticker)) {
      const result = await remove(ticker);
      return {
        ok: result.ok,
        removed: result.ok,
        error: result.error,
      };
    }

    const result = await add(ticker, companyName, source);
    return {
      ok: result.ok,
      added: result.ok,
      error: result.error,
    };
  };

  return (
    <WatchlistContext.Provider
      value={{
        items,
        tickers,
        loading,
        ready,
        hasTicker,
        add,
        remove,
        toggle,
        toggleTicker,
        refresh,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
