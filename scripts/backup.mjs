import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import fs from "fs";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BACKUP_DIR = "/home/paul/backups/safe";
const KEEP_DAYS = 14;
const BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
const ADMIN_CHAT = "7881047668";
const START = Date.now();

async function log(status, title, message, details = {}) {
  await supabase.from("system_logs").insert({
    log_type: "backup",
    status,
    title,
    message,
    details,
    duration_seconds: ((Date.now() - START) / 1000).toFixed(1),
  });
}

async function notify(text) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT,
      text,
      parse_mode: "Markdown",
    }),
  }).catch(() => {});
}

async function run() {
  console.log("[Backup] Starting...");
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const files = [];

    // 1. Backup dev site (exclude .next/node_modules/.git/.venv)
    console.log("[Backup] Backing up dev site...");
    execSync(
      `tar -czf ${BACKUP_DIR}/aurora-dev-${stamp}.tar.gz --exclude='.next' --exclude='node_modules' --exclude='.git' --exclude='.venv' -C /var/www aurora-app-dev`,
      { stdio: "pipe" }
    );
    files.push(`aurora-dev-${stamp}.tar.gz`);

    // 2. Backup live site
    console.log("[Backup] Backing up live site...");
    execSync(
      `tar -czf ${BACKUP_DIR}/aurora-live-${stamp}.tar.gz --exclude='.next' --exclude='node_modules' --exclude='.git' --exclude='.venv' -C /var/www aurora-app`,
      { stdio: "pipe" }
    );
    files.push(`aurora-live-${stamp}.tar.gz`);

    // 3. Backup env files (restricted permissions)
    fs.copyFileSync("/var/www/aurora-app-dev/.env.local", `${BACKUP_DIR}/env-dev-${stamp}.txt`);
    fs.copyFileSync("/var/www/aurora-app/.env.local", `${BACKUP_DIR}/env-live-${stamp}.txt`);
    execSync(`chmod 600 ${BACKUP_DIR}/env-*-${stamp}.txt`, { stdio: "pipe" });
    files.push(`env-dev-${stamp}.txt`, `env-live-${stamp}.txt`);

    // 4. Check file sizes
    const sizes = files.map((f) => {
      try {
        const stat = fs.statSync(`${BACKUP_DIR}/${f}`);
        return { file: f, size: (stat.size / 1024 / 1024).toFixed(1) + "MB" };
      } catch {
        return { file: f, size: "unknown" };
      }
    });

    // 5. Clean up old backups
    let deleted = 0;
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      const full = `${BACKUP_DIR}/${f}`;
      try {
        if (fs.statSync(full).mtimeMs < cutoff) {
          fs.unlinkSync(full);
          deleted++;
        }
      } catch {}
    }

    const duration = ((Date.now() - START) / 1000).toFixed(1);
    const sizeList = sizes.map((s) => `• ${s.file}: ${s.size}`).join("\n");

    await log("success", `Backup ${stamp}`, `Completed in ${duration}s. ${deleted} old files cleaned.`, {
      files: sizes,
      deleted,
      duration,
    });

    await notify(
      `✅ *Aurora Backup Success*\n\nCompleted in ${duration}s\n\n${sizeList}\n\nOld files cleaned: ${deleted}\nRetention: ${KEEP_DAYS} days\n\n_${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}_`
    );

    console.log(`[Backup] Done in ${duration}s ✅`);
  } catch (e) {
    const duration = ((Date.now() - START) / 1000).toFixed(1);
    console.error("[Backup] FAILED:", e.message);

    await log("failed", `Backup ${stamp} FAILED`, e.message, { error: e.message, duration });

    await notify(
      `❌ *Aurora Backup FAILED*\n\nError: ${e.message.slice(0, 200)}\nDuration: ${duration}s\n\n_${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}_`
    );
  }
}

run();
