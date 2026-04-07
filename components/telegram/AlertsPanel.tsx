"use client";

import { useState, useEffect, useCallback } from "react";

interface Alert {
  id: string;
  symbol: string;
  company_name: string | null;
  alert_type: string;
  target_price: number;
  reference_price: number | null;
  triggered: boolean;
  is_active?: boolean;
  created_at: string;
}

const SYSTEM_ALERTS = [
  { icon: "🔐", label: "Login notification", desc: "Sent every time you log in to Aurora" },
  { icon: "⭐", label: "Watchlist add", desc: "Sent when you add a stock to your watchlist" },
  { icon: "📧", label: "Onboarding emails", desc: "Aurora Growth Academy email sequence" },
];

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data?.alerts) ? data.alerts : Array.isArray(data) ? data : [];
      setAlerts(list);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const deleteAlert = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* ignore */
    }
    setDeleting(null);
  };

  const activeAlerts = alerts.filter((a) => !a.triggered && a.is_active !== false);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="space-y-5">
      {/* System Alerts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-white">System Alerts</h3>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            Always ON
          </span>
        </div>
        <p className="mb-3 text-xs text-white/30">
          Sent automatically by Aurora. These cannot be turned off.
        </p>
        <div className="space-y-2">
          {SYSTEM_ALERTS.map((alert) => (
            <div
              key={alert.label}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
            >
              <span className="flex-shrink-0 text-lg">{alert.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white/80">{alert.label}</p>
                <p className="text-xs text-white/40">{alert.desc}</p>
              </div>
              <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-emerald-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Price Alerts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Your Price Alerts</h3>
            <p className="mt-0.5 text-xs text-white/30">
              Set from the 🔔 bell on any watchlist stock
            </p>
          </div>
          {activeAlerts.length > 0 && (
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
              {activeAlerts.length} active
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-center">
            <p className="text-sm text-white/30">No price alerts set yet</p>
            <p className="mt-1 text-xs text-white/20">
              Go to your watchlist and tap 🔔 on any stock to set an alert
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => {
              const isAbove = alert.alert_type.includes("above");
              const isEntry = alert.alert_type.includes("entry");
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    isEntry
                      ? "border-amber-500/20 bg-amber-500/[0.06]"
                      : isAbove
                        ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                        : "border-red-500/20 bg-red-500/[0.06]"
                  }`}
                >
                  <span className="flex-shrink-0 text-lg">
                    {isEntry ? "⚡" : isAbove ? "📈" : "📉"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{alert.symbol}</p>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isEntry
                            ? "bg-amber-500/15 text-amber-400"
                            : isAbove
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {isEntry ? "entry" : isAbove ? "above" : "below"}{" "}
                        <span className="font-mono">
                          ${parseFloat(String(alert.target_price)).toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <p className="truncate text-xs text-white/40">
                      {alert.company_name || alert.symbol}
                      {alert.reference_price && (
                        <span className="ml-2">
                          · Set at ${parseFloat(String(alert.reference_price)).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    disabled={deleting === alert.id}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm text-white/30 transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                  >
                    {deleting === alert.id ? "…" : "×"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-white/50">
            Triggered ({triggeredAlerts.length})
          </h3>
          <div className="space-y-2">
            {triggeredAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 opacity-50"
              >
                <span className="flex-shrink-0 text-lg">✓</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/60">
                    {alert.symbol}{" "}
                    <span className="text-xs text-white/30">
                      {alert.alert_type.includes("above") ? "above" : "below"}{" "}
                      ${parseFloat(String(alert.target_price)).toFixed(2)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  disabled={deleting === alert.id}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm text-white/30 transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                >
                  {deleting === alert.id ? "…" : "×"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to set alerts */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          How to set a price alert
        </p>
        <div className="space-y-1.5">
          {[
            "1. Go to My Watchlist",
            "2. Click the 🔔 bell icon on any stock row",
            "3. Toggle Rise, Fall, or Entry Level alerts on",
            "4. Adjust the target price and click Save Alerts",
            "5. You'll get a Telegram confirmation instantly",
          ].map((step, i) => (
            <p key={i} className="text-xs text-white/40">{step}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
