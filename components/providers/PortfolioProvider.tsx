"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

const PortfolioContext = createContext<{
  data: Snapshot;
  refresh: () => Promise<void>;
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

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot>(defaultState);

  async function load() {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [positionsRes, overviewRes] = await Promise.all([
        fetch("/api/trading212/positions", { cache: "no-store" }),
        fetch("/api/trading212/overview", { cache: "no-store" }),
      ]);

      if (!positionsRes.ok) {
        throw new Error(`Trading 212 positions API returned ${positionsRes.status}`);
      }

      const positionsJson = await positionsRes.json();
      const overviewJson = overviewRes.ok ? await overviewRes.json() : null;

      const positions =
        positionsJson?.positions ||
        positionsJson?.rows ||
        positionsJson?.data ||
        (Array.isArray(positionsJson) ? positionsJson : []);

      const overview =
        overviewJson?.overview ||
        overviewJson?.data ||
        overviewJson ||
        null;

      const safePositions = Array.isArray(positions) ? positions : [];

      const totalCost =
        toNumber(overview?.total_cost) ||
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
        (todayPnl ? totalValue - todayPnl : totalCost);

      setData({
        connected: true,
        loading: false,
        error: null,
        count: safePositions.length,
        portfolioValue: totalValue,
        todayPnl,
        openValue,
        returnPct: totalReturn,
        updatedAt: new Date().toISOString(),
        positions: safePositions,
        overview,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load Trading 212 data";

      setData({
        ...defaultState,
        connected: false,
        loading: false,
        error: message,
      });
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(
    () => ({
      data,
      refresh: load,
    }),
    [data]
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
