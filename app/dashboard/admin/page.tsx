import Link from "next/link";
import os from "os";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const execAsync = promisify(exec);

type Pm2App = {
  name?: string;
  monit?: {
    memory?: number;
    cpu?: number;
  };
  pm2_env?: {
    status?: string;
    exec_cwd?: string;
  };
};

type DeployEntry = {
  stamp: string;
  action: string;
  detail: string;
};

type ReleaseEntry = {
  stamp: string;
  message: string;
};

type ActivityRow = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  event_type?: string | null;
  event_label?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

function formatBytes(bytes?: number) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** power;
  return `${scaled.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatPercent(value?: number) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0%";
  return `${num.toFixed(num >= 10 ? 0 : 1)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeTone(value?: string | null) {
  const v = (value || "").toLowerCase();
  if (
    v.includes("online") ||
    v.includes("connected") ||
    v.includes("success") ||
    v.includes("complete") ||
    v.includes("presence") ||
    v.includes("login")
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (v.includes("error") || v.includes("failed") || v.includes("offline")) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }
  if (v.includes("warning") || v.includes("pending") || v.includes("password")) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

async function safeReadFile(path: string) {
  try {
    return await fs.readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function getDeployLog(): Promise<DeployEntry[]> {
  const content = await safeReadFile("/home/paul/logs/aurora-deploy.log");
  if (!content.trim()) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+?)\]\s+(.*)$/);
      if (!match) return { stamp: "", action: "Log", detail: line };

      const stamp = match[1];
      const rest = match[2];

      const action =
        rest.includes("DEPLOY START") ? "Deploy Start" :
        rest.includes("Backup live") ? "Backup" :
        rest.includes("Pull latest from GitHub") ? "Git Pull" :
        rest.includes("Install + build") ? "Build" :
        rest.includes("Restart PM2") ? "PM2 Restart" :
        rest.includes("Deployed commit:") ? "Commit" :
        rest.includes("DEPLOY COMPLETE") ? "Deploy Complete" :
        "Log";

      return { stamp, action, detail: rest };
    })
    .reverse()
    .slice(0, 15);
}

async function getReleaseLog(): Promise<ReleaseEntry[]> {
  const content = await safeReadFile("/home/paul/logs/aurora-release.log");
  if (!content.trim()) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+?)\]\s+RELEASE:\s+(.*)$/);
      return {
        stamp: match?.[1] || "",
        message: match?.[2] || line,
      };
    })
    .reverse()
    .slice(0, 10);
}

async function getPm2Apps(): Promise<Pm2App[]> {
  try {
    const { stdout } = await execAsync("pm2 jlist");
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getCurrentLiveCommit() {
  try {
    const { stdout } = await execAsync("cd /var/www/aurora-app && git log --oneline -1");
    return stdout.trim();
  } catch {
    return "Unavailable";
  }
}

async function getLastBackupFile() {
  try {
    const dir = "/var/www/backups/aurora-live";
    const files = await fs.readdir(dir);
    const matching = files
      .filter((file) => file.startsWith("live-") && file.endsWith(".tar.gz"))
      .sort()
      .reverse();
    return matching[0] || "No backups found";
  } catch {
    return "No backups found";
  }
}

async function getActivity(): Promise<ActivityRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/user_activity_log?select=id,user_id,email,event_type,event_label,metadata,created_at&order=created_at.desc&limit=20`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [
    pm2Apps,
    deployLog,
    releaseLog,
    liveCommit,
    lastBackupFile,
    activity,
  ] = await Promise.all([
    getPm2Apps(),
    getDeployLog(),
    getReleaseLog(),
    getCurrentLiveCommit(),
    getLastBackupFile(),
    getActivity(),
  ]);

  const liveApp = pm2Apps.find((app) => app.name === "aurora-app");
  const devApp = pm2Apps.find((app) => app.name === "aurora-app-dev");

  const serverUptimeHours = Math.floor(os.uptime() / 3600);
  const serverMemoryUsed = os.totalmem() - os.freemem();

  return (
    <div className="min-h-screen bg-[#020b22] text-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(6,17,48,0.96),rgba(2,10,34,0.98))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.34em] text-cyan-300/80">
                Aurora Admin
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[0.08em] text-white">
                Platform Control Centre
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400">
                Signed in as {admin.email}. This area is restricted to admin accounts only.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Live Server",
              value: liveApp?.pm2_env?.status || "Unknown",
              sub: liveApp?.pm2_env?.exec_cwd || "/var/www/aurora-app",
            },
            {
              label: "Last Deploy Commit",
              value: liveCommit,
              sub: lastBackupFile,
            },
            {
              label: "Dev App",
              value: devApp?.pm2_env?.status || "Unknown",
              sub: devApp?.pm2_env?.exec_cwd || "/var/www/aurora-app-dev",
            },
            {
              label: "Server Uptime",
              value: `${serverUptimeHours}h`,
              sub: `${formatBytes(serverMemoryUsed)} / ${formatBytes(os.totalmem())} used`,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
            >
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-3 text-xl font-semibold text-white">{card.value}</div>
              <div className="mt-2 text-sm text-slate-500">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              Server Health
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hostname</span>
                <span className="font-medium text-slate-100">{os.hostname()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Platform</span>
                <span className="font-medium text-slate-100">{os.platform()} / {os.arch()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CPU Load</span>
                <span className="font-medium text-slate-100">
                  {os.loadavg().map((v) => v.toFixed(2)).join(" / ")}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              PM2 Live App
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeTone(liveApp?.pm2_env?.status)}`}>
                  {liveApp?.pm2_env?.status || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CPU</span>
                <span className="font-medium text-slate-100">{formatPercent(liveApp?.monit?.cpu)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Memory</span>
                <span className="font-medium text-slate-100">{formatBytes(liveApp?.monit?.memory)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              PM2 Dev App
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeTone(devApp?.pm2_env?.status)}`}>
                  {devApp?.pm2_env?.status || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CPU</span>
                <span className="font-medium text-slate-100">{formatPercent(devApp?.monit?.cpu)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Memory</span>
                <span className="font-medium text-slate-100">{formatBytes(devApp?.monit?.memory)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-4 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              Recent Deployments
            </div>
            <div className="space-y-3">
              {deployLog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                  No deploy log found yet.
                </div>
              ) : (
                deployLog.map((entry, index) => (
                  <div key={`${entry.stamp}-${index}`} className="rounded-2xl border border-white/6 bg-[#07132d] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs ${badgeTone(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className="text-xs text-slate-500">{entry.stamp || "No timestamp"}</span>
                    </div>
                    <div className="mt-3 text-sm text-slate-200">{entry.detail}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-4 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              Release Messages
            </div>
            <div className="space-y-3">
              {releaseLog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                  No release log found yet.
                </div>
              ) : (
                releaseLog.map((entry, index) => (
                  <div key={`${entry.stamp}-${index}`} className="rounded-2xl border border-white/6 bg-[#07132d] p-4">
                    <div className="text-xs text-slate-500">{entry.stamp || "No timestamp"}</div>
                    <div className="mt-2 text-sm text-slate-100">{entry.message}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-4 text-[11px] uppercase tracking-[0.28em] text-slate-400">
            User Activity
          </div>

          <div className="space-y-3">
            {activity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                No activity yet.
              </div>
            ) : (
              activity.map((row, index) => (
                <div
                  key={row.id || index}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-[#07132d] px-4 py-3 text-sm"
                >
                  <div>
                    <div className="text-white">{row.email || "Unknown user"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${badgeTone(row.event_type)}`}>
                        {row.event_type || "event"}
                      </span>
                      <span className="text-slate-300">{row.event_label || "Activity logged"}</span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    {formatDate(row.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
