"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: {
    total: number;
    active: number;
    telegram: number;
    byPlan: Record<string, number>;
  };
  watchlist: { live: number; demo: number };
  alerts: number;
  scanner: {
    total: number;
    core: number;
    alternative: number;
    green: number;
    amber: number;
    red: number;
  };
  connections: number;
  logs: Array<{
    id: string;
    log_type: string;
    status: string;
    title: string;
    message: string;
    details: unknown;
    duration_seconds: number;
    created_at: string;
  }>;
};

const STATUS_COLOURS: Record<string, string> = {
  success: "text-green-400 bg-green-500/10 border-green-500/20",
  failed: "text-red-400 bg-red-500/10 border-red-500/20",
  running: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const STATUS_ICONS: Record<string, string> = {
  success: "✅",
  failed: "❌",
  running: "🔄",
  warning: "⚠️",
};

const TYPE_ICONS: Record<string, string> = {
  backup: "💾",
  build: "🔨",
  restart: "🔄",
  scanner: "📡",
  error: "🚨",
  info: "ℹ️",
  cron: "⏰",
};

function formatLogDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SystemOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [logFilter, setLogFilter] = useState("all");
  const [message, setMessage] = useState("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-stats");
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const triggerBackup = async () => {
    setBacking(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/trigger-backup", { method: "POST" });
      const data = await res.json();
      setMessage(data.success ? `✅ ${data.message}` : `❌ ${data.error}`);
      setTimeout(loadStats, 5000);
    } catch {
      setMessage("❌ Backup trigger failed");
    }
    setBacking(false);
  };

  const syncScanner = async () => {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/sync-scanner", { method: "POST" });
      const data = await res.json();
      setMessage(data.success ? `✅ Scanner synced — ${data.message || "done"}` : `❌ ${data.error}`);
      setTimeout(loadStats, 3000);
    } catch {
      setMessage("❌ Scanner sync failed");
    }
    setSyncing(false);
  };

  const testTelegram = async () => {
    setTestingTg(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/test-telegram", { method: "POST" });
      const data = await res.json();
      setMessage(data.success || data.ok ? "✅ Test alert sent to Telegram" : `❌ ${data.error}`);
    } catch {
      setMessage("❌ Telegram test failed");
    }
    setTestingTg(false);
  };

  const filteredLogs =
    stats?.logs.filter((l) =>
      logFilter === "all" ? true : l.log_type === logFilter
    ) || [];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-red-400 text-sm">Failed to load system stats</p>;
  }

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-bold ${
            message.startsWith("✅")
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={syncScanner}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-50 transition-all"
        >
          {syncing ? (
            <span className="w-3 h-3 border border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          ) : (
            "📡"
          )}
          {syncing ? "Syncing Finviz..." : "Sync Scanner (Finviz)"}
        </button>
        <button
          onClick={triggerBackup}
          disabled={backing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-purple-400/10 border border-purple-400/20 text-purple-400 hover:bg-purple-400/20 disabled:opacity-50 transition-all"
        >
          {backing ? (
            <span className="w-3 h-3 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
          ) : (
            "💾"
          )}
          {backing ? "Starting..." : "Run Backup"}
        </button>
        <button
          onClick={testTelegram}
          disabled={testingTg}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/20 disabled:opacity-50 transition-all"
        >
          {testingTg ? "Sending..." : "📱 Test Telegram"}
        </button>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: stats.users.total, color: "text-white" },
          { label: "Active Subs", value: stats.users.active, color: "text-green-400" },
          { label: "Telegram", value: stats.users.telegram, color: "text-cyan-400" },
          { label: "T212 Connected", value: stats.connections, color: "text-purple-400" },
          { label: "Active Alerts", value: stats.alerts, color: "text-amber-400" },
          { label: "Watchlist (Live)", value: stats.watchlist.live, color: "text-white" },
          { label: "Scanner Stocks", value: stats.scanner.total, color: "text-white" },
          { label: "Green Signals", value: stats.scanner.green, color: "text-green-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/[0.03] border border-white/8 rounded-xl p-4"
          >
            <p className="text-white/30 text-xs">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Plans + Scanner readiness */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider font-bold mb-3">
            Users by Plan
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { plan: "Elite", count: stats.users.byPlan.elite, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
              { plan: "Pro", count: stats.users.byPlan.pro, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
              { plan: "Core", count: stats.users.byPlan.core, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            ].map((item) => (
              <div key={item.plan} className={`rounded-xl p-3 text-center border ${item.bg}`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.plan}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider font-bold mb-3">
            Scanner Readiness ({stats.scanner.total})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Green", count: stats.scanner.green, dot: "bg-green-400", color: "text-green-400" },
              { label: "Amber", count: stats.scanner.amber, dot: "bg-amber-400", color: "text-amber-400" },
              { label: "Red", count: stats.scanner.red, dot: "bg-red-400", color: "text-red-400" },
              { label: "Grey", count: stats.scanner.total - stats.scanner.green - stats.scanner.amber - stats.scanner.red, dot: "bg-white/20", color: "text-white/40" },
            ].map((item) => (
              <div key={item.label} className="bg-white/[0.02] rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  <p className="text-white/40 text-[10px]">{item.label}</p>
                </div>
                <p className={`text-lg font-bold ${item.color}`}>{item.count}</p>
              </div>
            ))}
          </div>
          {stats.scanner.total > 0 && (
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
              {[
                { count: stats.scanner.green, color: "bg-green-500" },
                { count: stats.scanner.amber, color: "bg-amber-500" },
                { count: stats.scanner.red, color: "bg-red-500" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`h-full ${item.color}`}
                  style={{ width: `${((item.count / stats.scanner.total) * 100).toFixed(1)}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <p className="text-white font-bold text-sm">System Logs</p>
          <div className="flex gap-1">
            {["all", "backup", "scanner", "build", "error", "cron"].map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setLogFilter(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    logFilter === type
                      ? "bg-cyan-400/20 border border-cyan-400/30 text-cyan-400"
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-white/30 text-sm">No logs yet</p>
              <p className="text-white/20 text-xs mt-1">
                Logs appear after backups, scanner syncs and builds
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02]"
              >
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[log.log_type] || "ℹ️"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white text-sm font-bold truncate">
                      {log.title}
                    </p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${
                        STATUS_COLOURS[log.status] || STATUS_COLOURS.warning
                      }`}
                    >
                      {STATUS_ICONS[log.status]} {log.status}
                    </span>
                  </div>
                  {log.message && (
                    <p className="text-white/40 text-xs truncate">{log.message}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-white/20 text-xs">
                      {formatLogDate(log.created_at)}
                    </p>
                    {log.duration_seconds != null && (
                      <p className="text-white/20 text-xs">
                        {log.duration_seconds}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
