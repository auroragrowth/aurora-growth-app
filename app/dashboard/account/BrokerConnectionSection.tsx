"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TradingMode = "paper" | "live";

type Connection = {
  id: string;
  broker: string;
  mode: TradingMode;
  display_name: string | null;
  account_id: string | null;
  account_currency: string | null;
  account_type: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function BrokerConnectionSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<TradingMode | null>(null);
  const [tradingMode, setTradingMode] = useState<TradingMode>("paper");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [setupMode, setSetupMode] = useState<TradingMode>("paper");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/connections/trading212", { cache: "no-store" });
      const data = await res.json();
      setTradingMode(data.tradingMode || "paper");
      setConnections(data.connections || []);
    } catch {
      setStatus("Could not load connections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const paperConnection = useMemo(
    () => connections.find((c) => c.mode === "paper") || null,
    [connections]
  );
  const liveConnection = useMemo(
    () => connections.find((c) => c.mode === "live") || null,
    [connections]
  );

  const hasAnyConnection = !!(paperConnection || liveConnection);

  async function saveConnection() {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: setupMode, apiKey, apiSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection.");
      setStatus(`${setupMode === "paper" ? "Paper" : "Live"} connection saved.`);
      setApiKey("");
      setApiSecret("");
      setShowAddForm(false);
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save connection.");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(mode: TradingMode) {
    setTesting(mode);
    setStatus("");
    try {
      const res = await fetch("/api/connections/trading212/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed.");
      setStatus(`${data.detectedMode === "paper" ? "Paper" : "Live"} connection verified.`);
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(null);
    }
  }

  async function disconnect(mode: TradingMode) {
    setStatus("");
    try {
      const res = await fetch(`/api/connections/trading212?mode=${mode}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove connection.");
      setStatus(`${mode === "paper" ? "Paper" : "Live"} connection removed.`);
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to remove connection.");
    }
  }

  if (loading) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="text-sm text-slate-400">Loading broker connections...</div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Broker Connection</div>
          <h3 className="mt-2 text-xl font-semibold text-white">Trading 212</h3>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
          hasAnyConnection
            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border border-rose-400/20 bg-rose-400/10 text-rose-300"
        }`}>
          <div className={`h-2 w-2 rounded-full ${hasAnyConnection ? "bg-emerald-400" : "bg-rose-400"}`} />
          {hasAnyConnection ? "Connected" : "Not connected"}
        </div>
      </div>

      {/* Current trading mode */}
      {hasAnyConnection && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-slate-400">Active mode:</span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            tradingMode === "paper"
              ? "bg-amber-300/15 text-amber-200"
              : "bg-emerald-300/15 text-emerald-200"
          }`}>
            {tradingMode === "paper" ? "Paper Trading" : "Live Trading"}
          </span>
        </div>
      )}

      {/* Connection cards */}
      <div className="mt-5 space-y-3">
        {([paperConnection, liveConnection] as const).map((connection, index) => {
          const mode: TradingMode = index === 0 ? "paper" : "live";
          if (!connection) return null;
          return (
            <div key={mode} className="rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${mode === "paper" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="text-sm font-medium text-white">
                    {mode === "paper" ? "Paper" : "Live"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {connection.account_id ? `Account: ${connection.account_id}` : ""}
                  {connection.account_currency ? ` (${connection.account_currency})` : ""}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                {connection.last_tested_at && (
                  <span>Tested: {new Date(connection.last_tested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                )}
                {connection.last_sync_at && (
                  <span>Synced: {new Date(connection.last_sync_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => testConnection(mode)}
                  disabled={testing === mode}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-40"
                >
                  {testing === mode ? "Testing..." : "Test"}
                </button>
                <button
                  onClick={() => disconnect(mode)}
                  className="rounded-full border border-rose-400/15 bg-rose-400/5 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10"
                >
                  Disconnect
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add connection form */}
      {showAddForm ? (
        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-5">
          <h4 className="text-sm font-semibold text-white">Add connection</h4>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setSetupMode("paper")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                setupMode === "paper"
                  ? "bg-amber-300/20 text-amber-200 border border-amber-400/30"
                  : "bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.05]"
              }`}
            >
              Paper
            </button>
            <button
              onClick={() => setSetupMode("live")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                setupMode === "live"
                  ? "bg-emerald-300/20 text-emerald-200 border border-emerald-400/30"
                  : "bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.05]"
              }`}
            >
              Live
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              placeholder="Paste Trading 212 API key"
            />
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              placeholder="API secret (optional)"
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Credentials are encrypted on the server and never exposed after saving.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={saveConnection}
              disabled={saving || !apiKey.trim()}
              className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save connection"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setApiKey(""); setApiSecret(""); setStatus(""); }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:brightness-110"
          >
            {hasAnyConnection ? "Add another connection" : "Connect Trading 212"}
          </button>

          {hasAnyConnection && (
            <Link
              href="/dashboard/connections"
              className="ml-3 text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Full setup wizard →
            </Link>
          )}
        </div>
      )}

      {/* Status message */}
      {status && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          status.includes("failed") || status.includes("Failed") || status.includes("Could not")
            ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
            : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
        }`}>
          {status}
        </div>
      )}
    </section>
  );
}
