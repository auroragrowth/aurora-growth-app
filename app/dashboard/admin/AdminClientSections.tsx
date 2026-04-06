"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = {
  totalUsers: number;
  activeSubs: number;
  core: number;
  pro: number;
  elite: number;
  recentSignups: number;
  trading212Connected: number;
};

type ErrorLog = {
  id: string;
  severity: string;
  route: string | null;
  message: string | null;
  user_id: string | null;
  resolved: boolean;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function severityColor(s: string) {
  if (s === "critical") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (s === "error") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (s === "warning") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

export function UserStatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-[24px] border border-white/8 bg-white/[0.03] p-5 h-28" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers, sub: `${stats.recentSignups} new this week` },
    { label: "Active Subscriptions", value: stats.activeSubs, sub: "Paid plans" },
    { label: "Plan Breakdown", value: `${stats.core}C / ${stats.pro}P / ${stats.elite}E`, sub: "Core / Pro / Elite" },
    { label: "Trading 212", value: stats.trading212Connected, sub: "Connected accounts" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{card.label}</div>
          <div className="mt-3 text-2xl font-semibold text-white">{card.value}</div>
          <div className="mt-2 text-sm text-slate-500">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function ErrorLogsSection() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [severity, setSeverity] = useState("all");

  const load = useCallback(async () => {
    try {
      const url = severity === "all" ? "/api/admin/error-logs" : `/api/admin/error-logs?severity=${severity}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      /* silently fail */
    }
  }, [severity]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function markResolved(id: string) {
    await fetch("/api/admin/error-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Error Logs</div>
        <div className="flex gap-1">
          {["all", "critical", "error", "warning", "info"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                severity === s
                  ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
            No error logs found.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`rounded-xl border border-white/6 bg-[#07132d] px-4 py-3 ${log.resolved ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${severityColor(log.severity)}`}>
                    {log.severity}
                  </span>
                  <span className="text-xs text-slate-500">{log.route || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDate(log.created_at)}</span>
                  {!log.resolved && (
                    <button
                      onClick={() => markResolved(log.id)}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-200">{log.message || "No message"}</div>
              {log.user_id && <div className="mt-1 text-xs text-slate-500">User: {log.user_id}</div>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function TelegramTestButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendTest() {
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/admin/test-telegram", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("sent");
      setMessage("Test alert sent — check Telegram");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sendTest}
        disabled={status === "sending"}
        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Test Telegram Alert"}
      </button>
      {message && (
        <span className={`text-sm ${status === "error" ? "text-rose-300" : "text-emerald-300"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

/* ── Scanner Sync Button ─────────────────────────────── */

export function ScannerSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-scanner", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
            Syncing Finviz data...
          </>
        ) : (
          "Sync Scanner from Finviz"
        )}
      </button>

      {result && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.success
              ? "border-emerald-500/20 bg-emerald-500/10"
              : "border-rose-500/20 bg-rose-500/10"
          }`}
        >
          {result.success ? (
            <div className="space-y-2">
              <p className="font-medium text-emerald-300">{result.message}</p>
              <div className="flex gap-4 text-xs text-white/50">
                <span>Core: <strong className="text-white">{result.core}</strong></span>
                <span>Alternative: <strong className="text-white">{result.alternative}</strong></span>
                <span>Total: <strong className="text-white">{result.total}</strong></span>
              </div>
              {result.output && (
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/30 p-2 text-xs text-white/30">
                  {result.output}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-rose-300">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
