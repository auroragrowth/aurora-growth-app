"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AccountStatus = {
  connected: boolean;
  plan: string;
  portfolioValue: number | null;
  todayPnL: number | null;
  totalPnL: number | null;
  totalReturnPct: number | null;
  positionsCount: number;
  marketStatus: "OPEN" | "CLOSED";
  lastUpdated: string | null;
  loading: boolean;
};

function getMarketStatus(): "OPEN" | "CLOSED" {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;

  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  const isOpen = totalMinutes >= 570 && totalMinutes < 960; // 09:30 to 16:00 New York

  return isWeekday && isOpen ? "OPEN" : "CLOSED";
}

function pickNumber(item: any, keys: string[]): number {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (!Number.isNaN(value) && Number.isFinite(value)) return value;
  }
  return 0;
}

export function useAccountStatus(): AccountStatus {
  const [connected, setConnected] = useState(false);
  const [plan, setPlan] = useState("Pro");
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [todayPnL, setTodayPnL] = useState<number | null>(null);
  const [totalPnL, setTotalPnL] = useState<number | null>(null);
  const [totalReturnPct, setTotalReturnPct] = useState<number | null>(null);
  const [positionsCount, setPositionsCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [positionsRes, accountRes] = await Promise.allSettled([
        fetch("/api/trading212/positions", { cache: "no-store" }),
        fetch("/api/account/status", { cache: "no-store" }),
      ]);

      let nextConnected = false;
      let nextPlan = "Pro";
      let nextPortfolioValue: number | null = null;
      let nextTodayPnL: number | null = null;
      let nextTotalPnL: number | null = null;
      let nextTotalReturnPct: number | null = null;
      let nextPositionsCount = 0;

      if (positionsRes.status === "fulfilled") {
        const json = await positionsRes.value.json().catch(() => null);

        if (json?.ok === true) {
          nextConnected = true;

          const rows = Array.isArray(json?.positions)
            ? json.positions
            : Array.isArray(json?.rows)
            ? json.rows
            : Array.isArray(json?.data)
            ? json.data
            : [];

          nextPositionsCount = rows.length;

          if (rows.length > 0) {
            let valueSum = 0;
            let investedSum = 0;
            let todaySum = 0;

            for (const item of rows) {
              const currentValue =
                pickNumber(item, [
                  "currentValue",
                  "marketValue",
                  "value",
                  "current_value",
                  "current_value_gbp",
                ]) ||
                pickNumber(item, ["quantity", "qty", "shares"]) *
                  pickNumber(item, ["currentPrice", "price", "current_price"]);

              const investedValue =
                pickNumber(item, [
                  "invested",
                  "costBasis",
                  "cost_basis",
                  "averageEntryValue",
                  "average_entry_value",
                ]) ||
                pickNumber(item, ["averagePrice", "average_price", "avgPrice"]) *
                  pickNumber(item, ["quantity", "qty", "shares"]);

              const dayPnl =
                pickNumber(item, [
                  "todayPnL",
                  "todaysPnL",
                  "dayPnL",
                  "day_pnl",
                  "dailyPnL",
                ]) ||
                pickNumber(item, ["dailyChange", "daily_change", "dayChange"]);

              valueSum += currentValue;
              investedSum += investedValue;
              todaySum += dayPnl;
            }

            const totalPnlValue = valueSum - investedSum;
            const totalReturn =
              investedSum > 0 ? (totalPnlValue / investedSum) * 100 : null;

            nextPortfolioValue = valueSum > 0 ? valueSum : null;
            nextTodayPnL = Number.isFinite(todaySum) ? todaySum : null;
            nextTotalPnL = Number.isFinite(totalPnlValue) ? totalPnlValue : null;
            nextTotalReturnPct = totalReturn;
          }
        }
      }

      if (accountRes.status === "fulfilled") {
        const json = await accountRes.value.json().catch(() => null);
        if (json?.ok === true && json?.plan) {
          nextPlan = String(json.plan);
        }
      }

      setConnected(nextConnected);
      setPlan(nextPlan);
      setPortfolioValue(nextPortfolioValue);
      setTodayPnL(nextTodayPnL);
      setTotalPnL(nextTotalPnL);
      setTotalReturnPct(nextTotalReturnPct);
      setPositionsCount(nextPositionsCount);
      setLastUpdated(new Date().toISOString());
    } catch {
      setConnected(false);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const refreshTimer = setInterval(load, 30000);
    const marketTimer = setInterval(() => {
      setLastUpdated((prev) => prev);
    }, 60000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(marketTimer);
    };
  }, [load]);

  const marketStatus = useMemo(() => getMarketStatus(), [lastUpdated]);

  return {
    connected,
    plan,
    portfolioValue,
    todayPnL,
    totalPnL,
    totalReturnPct,
    positionsCount,
    marketStatus,
    lastUpdated,
    loading,
  };
}
