import { supabaseAdmin } from "@/lib/supabase/admin";

type LogType = "backup" | "build" | "restart" | "scanner" | "error" | "info" | "cron";
type LogStatus = "success" | "failed" | "running" | "warning";

export async function systemLog(
  log_type: LogType,
  status: LogStatus,
  title: string,
  message?: string,
  details?: Record<string, unknown>,
  duration_seconds?: number
) {
  try {
    await supabaseAdmin.from("system_logs").insert({
      log_type,
      status,
      title,
      message: message || null,
      details: details || null,
      duration_seconds: duration_seconds || null,
    });
  } catch (e) {
    console.error("[SystemLog]", e);
  }
}
