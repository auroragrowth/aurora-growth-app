"use client";

import { useEffect, useState } from "react";

type Summary = {
  accountId?: string;
  currencyCode?: string;
  freeCash: number;
  invested: number;
  result: number;
  total: number;
};

export function useTrading212Summary() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/trading212/summary", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!data?.ok) {
        setConnected(false);
        setSummary(null);
        return;
      }

      setConnected(!!data.connected);
      setSummary(data.summary || null);
      setFetchedAt(data.fetchedAt || null);
    } catch (error) {
      console.error("Failed to load Trading 212 summary", error);
      setConnected(false);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  return {
    loading,
    connected,
    summary,
    fetchedAt,
    refresh: load,
  };
}
