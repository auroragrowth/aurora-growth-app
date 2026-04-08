import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();

    exec(
      "node /var/www/aurora-app-dev/scripts/backup.mjs >> /var/log/aurora-backup.log 2>&1"
    );

    return NextResponse.json({
      success: true,
      message: "Backup started — you will receive a Telegram notification when complete",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
