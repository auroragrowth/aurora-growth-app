import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";

const run = promisify(exec);

async function shell(cmd: string): Promise<string> {
  try {
    const { stdout } = await run(cmd);
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    await requireAdmin();

    const [diskRaw, pm2Raw, gitDev, gitLive, lastBuildDev, lastBuildLive] =
      await Promise.all([
        shell("df -B1 / | tail -1"),
        shell("pm2 jlist"),
        shell("cd /var/www/aurora-app-dev && git log --oneline -1"),
        shell("cd /var/www/aurora-app && git log --oneline -1"),
        shell(
          "stat -c %Y /var/www/aurora-app-dev/.next/BUILD_ID 2>/dev/null || echo 0"
        ),
        shell(
          "stat -c %Y /var/www/aurora-app/.next/BUILD_ID 2>/dev/null || echo 0"
        ),
      ]);

    // CPU
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuUsagePct = Math.min(
      100,
      Math.round((loadAvg[0] / cpus.length) * 100)
    );

    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = Math.round((usedMem / totalMem) * 100);

    // Disk
    const diskParts = diskRaw.split(/\s+/);
    const diskTotal = Number(diskParts[1] || 0);
    const diskUsed = Number(diskParts[2] || 0);
    const diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

    // Uptime
    const uptimeSecs = os.uptime();
    const uptimeDays = Math.floor(uptimeSecs / 86400);
    const uptimeHours = Math.floor((uptimeSecs % 86400) / 3600);

    // PM2 apps
    let pm2Apps: Array<{
      name: string;
      status: string;
      cpu: number;
      memory: number;
      uptime: number;
      restarts: number;
    }> = [];
    try {
      const parsed = JSON.parse(pm2Raw);
      if (Array.isArray(parsed)) {
        pm2Apps = parsed.map((app: any) => ({
          name: app.name || "unknown",
          status: app.pm2_env?.status || "unknown",
          cpu: app.monit?.cpu || 0,
          memory: app.monit?.memory || 0,
          uptime: app.pm2_env?.pm_uptime || 0,
          restarts: app.pm2_env?.restart_time || 0,
        }));
      }
    } catch {}

    // Build times
    const devBuildTs = Number(lastBuildDev) * 1000;
    const liveBuildTs = Number(lastBuildLive) * 1000;

    return NextResponse.json({
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || "Unknown",
        loadAvg: loadAvg.map((v) => Number(v.toFixed(2))),
        usagePct: cpuUsagePct,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        pct: memPct,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskTotal - diskUsed,
        pct: diskPct,
      },
      uptime: {
        seconds: uptimeSecs,
        days: uptimeDays,
        hours: uptimeHours,
        formatted: `${uptimeDays}d ${uptimeHours}h`,
      },
      hostname: os.hostname(),
      platform: `${os.platform()} ${os.arch()}`,
      pm2: pm2Apps,
      git: {
        dev: gitDev,
        live: gitLive,
      },
      builds: {
        dev: devBuildTs > 0 ? new Date(devBuildTs).toISOString() : null,
        live: liveBuildTs > 0 ? new Date(liveBuildTs).toISOString() : null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
