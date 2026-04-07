"use client";

import { useEffect, useState } from "react";

type AlertConfig = {
  enabled: boolean;
  pct: number;
  price: number;
};

type ExistingAlerts = {
  above?: { id: string; target_price: number; triggered: boolean };
  below?: { id: string; target_price: number; triggered: boolean };
  entry?: { id: string; target_price: number; triggered: boolean };
};

type Props = {
  symbol: string;
  companyName?: string | null;
  currentPrice: number;
  existingAlerts: ExistingAlerts;
  onClose: () => void;
  onSaved: () => void;
};

export default function PriceAlertModal({
  symbol,
  companyName,
  currentPrice,
  existingAlerts,
  onClose,
  onSaved,
}: Props) {
  const [fetchedPrice, setFetchedPrice] = useState(currentPrice || 0);

  useEffect(() => {
    if (fetchedPrice > 0) return;
    fetch(`/api/aurora-market-scanner?universe=all`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const match = rows.find(
          (r: any) =>
            String(r.ticker || "").toUpperCase() === symbol.toUpperCase()
        );
        if (match?.price) setFetchedPrice(Number(match.price));
      })
      .catch(() => {});
  }, [symbol, fetchedPrice]);

  const base = fetchedPrice || currentPrice || 0;

  const [rise, setRise] = useState<AlertConfig>(() => {
    if (existingAlerts.above) {
      const pct = base > 0 ? Math.round(((existingAlerts.above.target_price - base) / base) * 100) : 10;
      return { enabled: true, pct, price: existingAlerts.above.target_price };
    }
    return { enabled: false, pct: 10, price: base * 1.1 };
  });

  const [fall, setFall] = useState<AlertConfig>(() => {
    if (existingAlerts.below) {
      const pct = base > 0 ? Math.round(((base - existingAlerts.below.target_price) / base) * 100) : 10;
      return { enabled: true, pct, price: existingAlerts.below.target_price };
    }
    return { enabled: false, pct: 10, price: base * 0.9 };
  });

  const [entry, setEntry] = useState<AlertConfig>(() => {
    if (existingAlerts.entry) {
      const pct = base > 0 ? Math.round(((base - existingAlerts.entry.target_price) / base) * 100) : 20;
      return { enabled: true, pct, price: existingAlerts.entry.target_price };
    }
    return { enabled: false, pct: 20, price: base * 0.8 };
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (base <= 0) return;
    if (!existingAlerts.above) {
      setRise((r) =>
        r.price === 0
          ? { ...r, price: base * (1 + r.pct / 100) }
          : r
      );
    }
    if (!existingAlerts.below) {
      setFall((f) =>
        f.price === 0
          ? { ...f, price: base * (1 - f.pct / 100) }
          : f
      );
    }
    if (!existingAlerts.entry) {
      setEntry((e) =>
        e.price === 0
          ? { ...e, price: base * (1 - e.pct / 100) }
          : e
      );
    }
  }, [base, existingAlerts]);

  function adjustRise(delta: number) {
    const next = Math.max(5, Math.min(50, rise.pct + delta));
    setRise({ ...rise, pct: next, price: base * (1 + next / 100) });
  }

  function adjustFall(delta: number) {
    const next = Math.max(5, Math.min(50, fall.pct + delta));
    setFall({ ...fall, pct: next, price: base * (1 - next / 100) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Delete all existing alerts for this symbol first
      await fetch(`/api/alerts?symbol=${symbol}`, { method: "DELETE" });

      const saves: Promise<any>[] = [];

      if (rise.enabled) {
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "price_above",
              target_price: rise.price,
              reference_price: base,
              percentage: rise.pct,
            }),
          })
        );
      }

      if (fall.enabled) {
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "price_below",
              target_price: fall.price,
              reference_price: base,
              percentage: fall.pct,
            }),
          })
        );
      }

      if (entry.enabled) {
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "entry_level",
              target_price: entry.price,
              reference_price: base,
              percentage: entry.pct,
            }),
          })
        );
      }

      await Promise.all(saves);
      onSaved();
      onClose();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-cyan-400/20 bg-[#060e1e] shadow-[0_8px_40px_rgba(0,180,255,0.12)]">
        {/* Header */}
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <h3 className="text-lg font-semibold text-white">
                Price Alerts — {symbol}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 transition hover:text-white"
            >
              ✕
            </button>
          </div>
          {companyName && (
            <div className="mt-1 text-sm text-white/40">{companyName}</div>
          )}
          <div className="mt-1 text-sm text-white/50">
            Current price: ${base.toFixed(2)}
          </div>
        </div>

        {/* Rise Alert */}
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">↑</span>
              <span className="text-sm font-medium text-white">Rise alert</span>
            </div>
            <button
              onClick={() => setRise((r) => ({ ...r, enabled: !r.enabled }))}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                rise.enabled
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-white/30"
              }`}
            >
              {rise.enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="mt-1 text-xs text-white/35">
            Alert when price rises above
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-white">
              ${rise.price.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-300/70">
              (+{rise.pct}%)
            </span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => adjustRise(-5)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 transition hover:bg-white/10"
              >
                −
              </button>
              <button
                onClick={() => adjustRise(5)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 transition hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Fall Alert */}
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-400">↓</span>
              <span className="text-sm font-medium text-white">Fall alert</span>
            </div>
            <button
              onClick={() => setFall((f) => ({ ...f, enabled: !f.enabled }))}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                fall.enabled
                  ? "bg-red-500/20 text-red-300"
                  : "bg-white/5 text-white/30"
              }`}
            >
              {fall.enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="mt-1 text-xs text-white/35">
            Alert when price falls below
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-white">
              ${fall.price.toFixed(2)}
            </span>
            <span className="text-xs text-red-300/70">
              (−{fall.pct}%)
            </span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => adjustFall(-5)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 transition hover:bg-white/10"
              >
                −
              </button>
              <button
                onClick={() => adjustFall(5)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50 transition hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Entry Level Alert */}
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span className="text-sm font-medium text-white">
                Entry level alert
              </span>
            </div>
            <button
              onClick={() =>
                setEntry((e) => ({ ...e, enabled: !e.enabled }))
              }
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                entry.enabled
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/5 text-white/30"
              }`}
            >
              {entry.enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div className="mt-1 text-xs text-white/35">
            Alert when price hits ladder entry level
          </div>
          <div className="mt-2">
            <span className="text-lg font-semibold text-white">
              ${entry.price.toFixed(2)}
            </span>
            <span className="ml-2 text-xs text-amber-300/70">
              (−{entry.pct}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-white/25">
            Based on calculator data or first {entry.pct}% drop from current
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={handleSave}
            disabled={saving || (!rise.enabled && !fall.enabled && !entry.enabled)}
            className="flex-1 rounded-xl bg-cyan-500/20 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Alerts"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
