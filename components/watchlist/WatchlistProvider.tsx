"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WatchlistApiItem = {
  id?: string;
  ticker?: string | null;
  created_at?: string | null;
};

type WatchlistGetResponse = {
  ok?: boolean;
  items?: WatchlistApiItem[];
  error?: string;
};

type WatchlistToggleResponse = {
  ok?: boolean;
  added?: boolean;
  ticker?: string;
  error?: string;
};

type WatchlistContextType = {
  items: string[];
  loading: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  isInWatchlist: (ticker?: string | null) => boolean;
  addToWatchlist: (ticker?: string | null) => Promise<void>;
  removeFromWatchlist: (ticker?: string | null) => Promise<void>;
  toggleWatchlist: (ticker?: string | null) => Promise<void>;
  isGuestMode: boolean;
};

const WatchlistContext = createContext<WatchlistContextType | null>(null);

const GUEST_STORAGE_KEY = "aurora_guest_watchlist";

function cleanTicker(ticker?: string | null): string {
  return (ticker || "").trim().toUpperCase();
}

function dedupeTickers(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => cleanTicker(v)).filter(Boolean)));
}

function readGuestWatchlist(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return dedupeTickers(parsed.map((item) => String(item)));
  } catch {
    return [];
  }
}

function writeGuestWatchlist(items: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(dedupeTickers(items)));
}

function clearGuestWatchlist() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_STORAGE_KEY);
}

async function fetchServerWatchlist(): Promise<{
  mode: "account" | "guest";
  items: string[];
}> {
  const res = await fetch("/api/watchlist", {
    method: "GET",
    cache: "no-store",
  });

  const data: WatchlistGetResponse = await res.json();

  if (res.ok) {
    const tickers = dedupeTickers(
      (data.items || []).map((row) => cleanTicker(row.ticker))
    );
    return { mode: "account", items: tickers };
  }

  if (res.status === 401) {
    return { mode: "guest", items: readGuestWatchlist() };
  }

  throw new Error(data?.error || "Failed to load watchlist");
}

async function toggleServerTicker(ticker: string): Promise<WatchlistToggleResponse> {
  const res = await fetch("/api/watchlist/toggle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker }),
  });

  const data: WatchlistToggleResponse = await res.json();

  if (res.status === 401) {
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    throw new Error(data?.error || "Failed to toggle watchlist");
  }

  return data;
}

export function WatchlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const mergeGuestIntoAccount = useCallback(async (accountItems: string[]) => {
    const guestItems = readGuestWatchlist();
    if (!guestItems.length) return accountItems;

    let merged = [...accountItems];

    for (const ticker of guestItems) {
      if (merged.includes(ticker)) continue;

      try {
        const result = await toggleServerTicker(ticker);
        if (result?.added) {
          merged = [...merged, ticker];
        } else {
          merged = merged.filter((x) => x !== ticker);
        }
      } catch (err) {
        console.error(`Failed to merge guest ticker ${ticker}:`, err);
      }
    }

    clearGuestWatchlist();
    return dedupeTickers(merged);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const result = await fetchServerWatchlist();

      if (result.mode === "guest") {
        setItems(result.items);
        setIsGuestMode(true);
      } else {
        const mergedItems = await mergeGuestIntoAccount(result.items);
        setItems(mergedItems);
        setIsGuestMode(false);
      }
    } catch (err) {
      console.error("Watchlist refresh failed:", err);
      const guestItems = readGuestWatchlist();
      setItems(guestItems);
      setIsGuestMode(true);
    } finally {
      setReady(true);
      setLoading(false);
    }
  }, [mergeGuestIntoAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isInWatchlist = useCallback(
    (ticker?: string | null) => {
      const t = cleanTicker(ticker);
      return !!t && items.includes(t);
    },
    [items]
  );

  const addToWatchlist = useCallback(
    async (ticker?: string | null) => {
      const t = cleanTicker(ticker);
      if (!t) return;

      if (isGuestMode) {
        const next = items.includes(t) ? items : dedupeTickers([...items, t]);
        setItems(next);
        writeGuestWatchlist(next);
        return;
      }

      if (items.includes(t)) return;

      const result = await toggleServerTicker(t);

      if (result?.added) {
        setItems((prev) => (prev.includes(t) ? prev : [...prev, t]));
      } else {
        setItems((prev) => prev.filter((x) => x !== t));
      }
    },
    [isGuestMode, items]
  );

  const removeFromWatchlist = useCallback(
    async (ticker?: string | null) => {
      const t = cleanTicker(ticker);
      if (!t) return;

      if (isGuestMode) {
        const next = items.filter((x) => x !== t);
        setItems(next);
        writeGuestWatchlist(next);
        return;
      }

      if (!items.includes(t)) return;

      const result = await toggleServerTicker(t);

      if (result?.added) {
        setItems((prev) => (prev.includes(t) ? prev : [...prev, t]));
      } else {
        setItems((prev) => prev.filter((x) => x !== t));
      }
    },
    [isGuestMode, items]
  );

  const toggleWatchlist = useCallback(
    async (ticker?: string | null) => {
      const t = cleanTicker(ticker);
      if (!t) return;

      if (isGuestMode) {
        const next = items.includes(t)
          ? items.filter((x) => x !== t)
          : dedupeTickers([...items, t]);

        setItems(next);
        writeGuestWatchlist(next);
        return;
      }

      const result = await toggleServerTicker(t);

      if (result?.added) {
        setItems((prev) => (prev.includes(t) ? prev : [...prev, t]));
      } else {
        setItems((prev) => prev.filter((x) => x !== t));
      }
    },
    [isGuestMode, items]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      ready,
      refresh,
      isInWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      isGuestMode,
    }),
    [
      items,
      loading,
      ready,
      refresh,
      isInWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      isGuestMode,
    ]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used inside WatchlistProvider");
  }
  return ctx;
}
