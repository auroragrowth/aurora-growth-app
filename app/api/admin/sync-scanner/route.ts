import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const scriptPath = process.cwd() + "/scripts/sync_scanner_results.mjs";

    console.log("[Admin] Starting scanner sync...");
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      timeout: 120000,
    });

    console.log("[Admin] Scanner sync output:", stdout);
    if (stderr) console.error("[Admin] Scanner stderr:", stderr);

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: counts } = await admin
      .from("scanner_results")
      .select("scanner_type");

    const core = counts?.filter((r) => r.scanner_type === "core").length || 0;
    const alt =
      counts?.filter((r) => r.scanner_type === "alternative").length || 0;

    return NextResponse.json({
      success: true,
      message: "Scanner synced successfully",
      core,
      alternative: alt,
      total: core + alt,
      output: stdout.slice(-500),
    });
  } catch (e: any) {
    console.error("[Admin] Sync error:", e);
    return NextResponse.json(
      { error: e.message || "Sync failed" },
      { status: 500 }
    );
  }
}
