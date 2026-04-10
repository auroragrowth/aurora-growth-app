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
    return { enabled: false, pct: 10, price: +(base * 1.1).toFixed(2) };
  });

  const [fall, setFall] = useState<AlertConfig>(() => {
    if (existingAlerts.below) {
      const pct = base > 0 ? Math.round(((base - existingAlerts.below.target_price) / base) * 100) : 10;
      return { enabled: true, pct, price: existingAlerts.below.target_price };
    }
    return { enabled: false, pct: 10, price: +(base * 0.9).toFixed(2) };
  });

  const [entry, setEntry] = useState<AlertConfig>(() => {
    if (existingAlerts.entry) {
      const pct = base > 0 ? Math.round(((base - existingAlerts.entry.target_price) / base) * 100) : 20;
      return { enabled: true, pct, price: existingAlerts.entry.target_price };
    }
    return { enabled: false, pct: 20, price: +(base * 0.8).toFixed(2) };
  });

  // String states for the input fields so user can type freely
  const [riseInput, setRiseInput] = useState(rise.price > 0 ? rise.price.toFixed(2) : "");
  const [fallInput, setFallInput] = useState(fall.price > 0 ? fall.price.toFixed(2) : "");
  const [entryInput, setEntryInput] = useState(entry.price > 0 ? entry.price.toFixed(2) : "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (base <= 0) return;
    if (!existingAlerts.above && rise.price === 0) {
      const p = +(base * 1.1).toFixed(2);
      setRise((r) => ({ ...r, price: p, pct: 10 }));
      setRiseInput(p.toFixed(2));
    }
    if (!existingAlerts.below && fall.price === 0) {
      const p = +(base * 0.9).toFixed(2);
      setFall((f) => ({ ...f, price: p, pct: 10 }));
      setFallInput(p.toFixed(2));
    }
    if (!existingAlerts.entry && entry.price === 0) {
      const p = +(base * 0.8).toFixed(2);
      setEntry((e) => ({ ...e, price: p, pct: 20 }));
      setEntryInput(p.toFixed(2));
    }
  }, [base, existingAlerts]);

  function handlePriceChange(
    val: string,
    type: "rise" | "fall" | "entry"
  ) {
    // Update the raw input string
    if (type === "rise") setRiseInput(val);
    if (type === "fall") setFallInput(val);
    if (type === "entry") setEntryInput(val);

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      if (type === "rise") setRise((r) => ({ ...r, price: 0, pct: 0 }));
      if (type === "fall") setFall((f) => ({ ...f, price: 0, pct: 0 }));
      if (type === "entry") setEntry((e) => ({ ...e, price: 0, pct: 0 }));
      return;
    }

    if (type === "rise") {
      const pct = base > 0 ? Math.round(((num - base) / base) * 100) : 0;
      setRise((r) => ({ ...r, price: num, pct }));
    } else if (type === "fall") {
      const pct = base > 0 ? Math.round(((base - num) / base) * 100) : 0;
      setFall((f) => ({ ...f, price: num, pct }));
    } else {
      const pct = base > 0 ? Math.round(((base - num) / base) * 100) : 0;
      setEntry((e) => ({ ...e, price: num, pct }));
    }
  }

  function handleBlur(type: "rise" | "fall" | "entry") {
    if (type === "rise" && rise.price > 0) setRiseInput(rise.price.toFixed(2));
    if (type === "fall" && fall.price > 0) setFallInput(fall.price.toFixed(2));
    if (type === "entry" && entry.price > 0) setEntryInput(entry.price.toFixed(2));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      // Delete all existing alerts for this symbol first
      await fetch(`/api/alerts?symbol=${symbol}`, { method: "DELETE" });

      const saves: Promise<any>[] = [];

      if (rise.enabled) {
        if (!rise.price || rise.price <= 0) { setError("Rise alert needs a valid price"); setSaving(false); return; }
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "above",
              target_price: +rise.price.toFixed(2),
              reference_price: +base.toFixed(2),
              percentage: rise.pct,
            }),
          }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed to save rise alert"); return d; })
        );
      }

      if (fall.enabled) {
        if (!fall.price || fall.price <= 0) { setError("Fall alert needs a valid price"); setSaving(false); return; }
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "below",
              target_price: +fall.price.toFixed(2),
              reference_price: +base.toFixed(2),
              percentage: fall.pct,
            }),
          }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed to save fall alert"); return d; })
        );
      }

      if (entry.enabled) {
        if (!entry.price || entry.price <= 0) { setError("Entry alert needs a valid price"); setSaving(false); return; }
        saves.push(
          fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              company_name: companyName,
              alert_type: "entry_level",
              target_price: +entry.price.toFixed(2),
              reference_price: +base.toFixed(2),
              percentage: entry.pct,
            }),
          }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed to save entry alert"); return d; })
        );
      }

      await Promise.all(saves);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save alerts");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = (focusColor: string) =>
    `w-28 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-lg font-semibold text-white outline-none transition focus:border-${focusColor}-400/40 focus:bg-white/8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

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
            <span className="text-white/50 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={riseInput}
              onChange={(e) => handlePriceChange(e.target.value, "rise")}
              onBlur={() => handleBlur("rise")}
              placeholder={(base * 1.1).toFixed(2)}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-lg font-semibold text-white outline-none transition focus:border-emerald-400/40 focus:bg-white/8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs text-emerald-300/70">
              {rise.pct > 0 ? `+${rise.pct}%` : rise.pct < 0 ? `${rise.pct}%` : ""}
            </span>
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
            <span className="text-white/50 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fallInput}
              onChange={(e) => handlePriceChange(e.target.value, "fall")}
              onBlur={() => handleBlur("fall")}
              placeholder={(base * 0.9).toFixed(2)}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-lg font-semibold text-white outline-none transition focus:border-red-400/40 focus:bg-white/8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs text-red-300/70">
              {fall.pct > 0 ? `−${fall.pct}%` : ""}
            </span>
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
            Alert when price hits entry level
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-white/50 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={entryInput}
              onChange={(e) => handlePriceChange(e.target.value, "entry")}
              onBlur={() => handleBlur("entry")}
              placeholder={(base * 0.8).toFixed(2)}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-lg font-semibold text-white outline-none transition focus:border-amber-400/40 focus:bg-white/8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs text-amber-300/70">
              {entry.pct > 0 ? `−${entry.pct}%` : ""}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-white/25">
            Enter your target entry price
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 pt-3 text-xs text-red-400">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-cyan-500/20 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-40"
          >
            {saving ? "Saving..." : (!rise.enabled && !fall.enabled && !entry.enabled) ? "Clear Alerts" : "Save Alerts"}
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
