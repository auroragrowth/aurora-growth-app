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

export type Position = {
  ticker?: string | null;
  symbol?: string | null;
  instrument?: string | null;
  company_name?: string | null;
  name?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  shares?: number | string | null;
  average_price?: number | string | null;
  avg_price?: number | string | null;
  averagePrice?: number | string | null;
  average_cost?: number | string | null;
  current_price?: number | string | null;
  current?: number | string | null;
  currentPrice?: number | string | null;
  price?: number | string | null;
  cost?: number | string | null;
  invested?: number | string | null;
  value?: number | string | null;
  marketValue?: number | string | null;
  pnl?: number | string | null;
  profit_loss?: number | string | null;
  pl?: number | string | null;
  ppl?: number | string | null;
  return_pct?: number | string | null;
  returnPct?: number | string | null;
  aurora_score?: number | string | null;
  aurora?: number | string | null;
};

export type Overview = {
  portfolio_value?: number | string | null;
  total_value?: number | string | null;
  total_cost?: number | string | null;
  total_pnl?: number | string | null;
  total_return_pct?: number | string | null;
  today_change?: number | string | null;
  open_value?: number | string | null;
  positions_count?: number | string | null;
  free_cash?: number | string | null;
  invested?: number | string | null;
};

type Snapshot = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  count: number;
  portfolioValue: number;
  todayPnl: number;
  openValue: number;
  returnPct: number;
  updatedAt: string | null;
  positions: Position[];
  overview: Overview | null;
};

type StatusResponse = {
  ok?: boolean;
  authenticated?: boolean;
  trading212?: {
    mode?: "paper" | "live";
    is_connected?: boolean;
  } | null;
};

const defaultState: Snapshot = {
  connected: false,
  loading: true,
  error: null,
  count: 0,
  portfolioValue: 0,
  todayPnl: 0,
  openValue: 0,
  returnPct: 0,
  updatedAt: null,
  positions: [],
  overview: null,
};

const REFRESH_COOLDOWN_MS = 25_000;

const PortfolioContext = createContext<{
  data: Snapshot;
  refresh: (force?: boolean) => Promise<void>;
}>({
  data: defaultState,
  refresh: async () => {},
});

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$£,%\s,]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getQty(row: Position): number {
  return toNumber(row.quantity ?? row.qty ?? row.shares);
}

function getAvgPrice(row: Position): number {
  return toNumber(
    row.average_price ?? row.avg_price ?? row.averagePrice ?? row.average_cost
  );
}

function getCurrent(row: Position): number {
  return toNumber(row.current_price ?? row.current ?? row.currentPrice ?? row.price);
}

function getCost(row: Position): number {
  const direct = toNumber(row.cost ?? row.invested);
  if (direct) return direct;
  return getQty(row) * getAvgPrice(row);
}

function getValue(row: Position): number {
  const direct = toNumber(row.value ?? row.marketValue);
  if (direct) return direct;
  return getQty(row) * getCurrent(row);
}

function getPnL(row: Position): number {
  const direct = toNumber(row.pnl ?? row.profit_loss ?? row.pl);
  if (direct) return direct;
  return getValue(row) - getCost(row);
}

function getReturn(row: Position): number {
  const direct = toNumber(row.return_pct ?? row.returnPct);
  if (direct) return direct;
  const cost = getCost(row);
  if (!cost) return 0;
  return (getPnL(row) / cost) * 100;
}

async function safeJson(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Expected JSON from ${res.url}, received non-JSON response`
    );
  }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot>(defaultState);

  const lastLoadedAtRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef<boolean>(true);

  const load = useCallback(async function load(force = false) {
    if (inflightRef.current) {
      return inflightRef.current;
    }

    const now = Date.now();
    const withinCooldown =
      !force &&
      lastLoadedAtRef.current > 0 &&
      now - lastLoadedAtRef.current < REFRESH_COOLDOWN_MS;

    if (withinCooldown) {
      return;
    }

    const request = (async () => {
      setData((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const statusRes = await fetch("/api/connections/status", {
          cache: "no-store",
          credentials: "include",
        });

        const statusJson = (await safeJson(statusRes)) as StatusResponse | null;
        const sqlConnected = Boolean(statusJson?.trading212?.is_connected);

        if (!mountedRef.current) return;

        if (!sqlConnected) {
          setData((prev) => ({
            ...prev,
            connected: false,
            loading: false,
            error: null,
          }));
          lastLoadedAtRef.current = Date.now();
          return;
        }

        const [overviewRes, positionsRes] = await Promise.all([
          fetch("/api/trading212/overview", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/trading212/positions", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        const overviewJson = overviewRes.ok ? await safeJson(overviewRes) : null;
        const positionsJson = positionsRes.ok ? await safeJson(positionsRes) : null;

        const overview =
          (overviewJson as any)?.overview ||
          (overviewJson as any)?.data ||
          null;

        const positions =
          (positionsJson as any)?.positions ||
          (positionsJson as any)?.rows ||
          (positionsJson as any)?.data ||
          (Array.isArray(positionsJson) ? positionsJson : []);

        const safePositions = Array.isArray(positions) ? positions : [];

        const totalCost =
          toNumber(overview?.total_cost ?? overview?.invested) ||
          safePositions.reduce((sum, row) => sum + getCost(row), 0);

        const totalValue =
          toNumber(overview?.portfolio_value ?? overview?.total_value) ||
          safePositions.reduce((sum, row) => sum + getValue(row), 0);

        const totalPnL =
          toNumber(overview?.total_pnl) ||
          (totalValue - totalCost);

        const totalReturn =
          toNumber(overview?.total_return_pct) ||
          (totalCost ? (totalPnL / totalCost) * 100 : 0);

        const todayPnl = toNumber(overview?.today_change);
        const openValue =
          toNumber(overview?.open_value) ||
          totalValue;

        if (!mountedRef.current) return;

        setData({
          connected: true,
          loading: false,
          error: null,
          count: toNumber(overview?.positions_count) || safePositions.length,
          portfolioValue: totalValue,
          todayPnl,
          openValue,
          returnPct: totalReturn,
          updatedAt: new Date().toISOString(),
          positions: safePositions,
          overview,
        });

        lastLoadedAtRef.current = Date.now();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load Trading 212 data";

        if (!mountedRef.current) return;

        setData((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = request;
    return request;
  // setData and refs are stable — empty deps is correct here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load(true);

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => load(true), 60_000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const value = useMemo(
    () => ({
      data,
      refresh: load,
    }),
    [data, load]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}

export function usePortfolioHelpers() {
  return {
    toNumber,
    getQty,
    getAvgPrice,
    getCurrent,
    getCost,
    getValue,
    getPnL,
    getReturn,
  };
}
