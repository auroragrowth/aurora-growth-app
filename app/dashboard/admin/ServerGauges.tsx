"use client";

import { useEffect, useState } from "react";

type ServerStats = {
  cpu: { cores: number; model: string; loadAvg: number[]; usagePct: number };
  memory: { total: number; used: number; free: number; pct: number };
  disk: { total: number; used: number; free: number; pct: number };
  uptime: { seconds: number; days: number; hours: number; formatted: string };
  hostname: string;
  platform: string;
  pm2: Array<{
    name: string;
    status: string;
    cpu: number;
    memory: number;
    uptime: number;
    restarts: number;
  }>;
  git: { dev: string; live: string };
  builds: { dev: string | null; live: string | null };
};

/* ── Gauge SVG ── */

function Gauge({
  value,
  max = 100,
  label,
  sub,
  color,
  size = 120,
}: {
  value: number;
  max?: number;
  label: string;
  sub: string;
  color: string;
  size?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc from 135° to 405° (270° sweep)
  const startAngle = 135;
  const endAngle = 405;
  const sweep = endAngle - startAngle;
  const filledAngle = startAngle + (sweep * pct) / 100;

  function polarToXY(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const bgStart = polarToXY(startAngle);
  const bgEnd = polarToXY(endAngle);
  const fillEnd = polarToXY(filledAngle);
  const largeArcBg = sweep > 180 ? 1 : 0;
  const largeArcFill = filledAngle - startAngle > 180 ? 1 : 0;

  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArcBg} 1 ${bgEnd.x} ${bgEnd.y}`;
  const fillPath =
    pct > 0
      ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArcFill} 1 ${fillEnd.x} ${fillEnd.y}`
      : "";

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  // Color zones
  let activeColor = color;
  if (pct > 85) activeColor = "#f87171";
  else if (pct > 70) activeColor = "#fbbf24";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Tick marks */}
        {ticks.map((t) => {
          const angle = startAngle + (sweep * t) / 100;
          const outer = polarToXY(angle);
          const inner = {
            x: cx + (r - 6) * Math.cos((angle * Math.PI) / 180),
            y: cy + (r - 6) * Math.sin((angle * Math.PI) / 180),
          };
          return (
            <line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={activeColor}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${activeColor}50)`,
              transition: "all 0.8s ease-out",
            }}
          />
        )}

        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="700"
        >
          {Math.round(pct)}%
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
        >
          {sub}
        </text>
      </svg>
      <p className="text-white/50 text-xs font-bold mt-1">{label}</p>
    </div>
  );
}

/* ── Formatters ── */

function fmtBytes(b: number) {
  if (b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  return `${(b / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtBuildTime(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pm2Uptime(ts: number) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

/* ── Main component ── */

export default function ServerGauges() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/server-stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return <p className="text-red-400 text-sm">Failed to load server stats</p>;

  const liveApp = stats.pm2.find((a) => a.name === "aurora-app");
  const devApp = stats.pm2.find((a) => a.name === "aurora-app-dev");

  return (
    <div className="space-y-4">
      {/* Gauges row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col items-center">
          <Gauge
            value={stats.cpu.usagePct}
            label="CPU"
            sub={`${stats.cpu.cores} cores`}
            color="#22d3ee"
          />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col items-center">
          <Gauge
            value={stats.memory.pct}
            label="Memory"
            sub={`${fmtBytes(stats.memory.used)} / ${fmtBytes(stats.memory.total)}`}
            color="#a78bfa"
          />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col items-center">
          <Gauge
            value={stats.disk.pct}
            label="Disk"
            sub={`${fmtBytes(stats.disk.used)} / ${fmtBytes(stats.disk.total)}`}
            color="#34d399"
          />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold text-white">{stats.uptime.formatted}</p>
          <p className="text-white/30 text-xs mt-1">Server Uptime</p>
          <p className="text-white/15 text-[10px] mt-2">{stats.hostname}</p>
          <p className="text-white/15 text-[10px]">{stats.platform}</p>
        </div>
      </div>

      {/* PM2 + Builds row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* PM2 Apps */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
            PM2 Processes
          </p>
          <div className="space-y-2">
            {[liveApp, devApp].filter(Boolean).map((app) => (
              <div
                key={app!.name}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      app!.status === "online"
                        ? "bg-green-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                        : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{app!.name}</p>
                    <p className="text-white/20 text-[10px]">
                      Up {pm2Uptime(app!.uptime)} · {app!.restarts} restarts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">{fmtBytes(app!.memory)}</p>
                  <p className="text-white/20 text-[10px]">{app!.cpu}% CPU</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Builds + Git */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
            Builds &amp; Git
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Live build</span>
              <span className="text-white text-xs font-medium">
                {fmtBuildTime(stats.builds.live)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Dev build</span>
              <span className="text-white text-xs font-medium">
                {fmtBuildTime(stats.builds.dev)}
              </span>
            </div>
            <div className="h-px bg-white/5" />
            <div>
              <p className="text-white/40 text-xs mb-1">Live commit</p>
              <p className="text-white/70 text-xs font-mono truncate">{stats.git.live || "—"}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Dev commit</p>
              <p className="text-white/70 text-xs font-mono truncate">{stats.git.dev || "—"}</p>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Load avg</span>
              <span className="text-white/60 text-xs font-mono">
                {stats.cpu.loadAvg.join(" / ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
