import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { BrokerMode } from "@/lib/trading212/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode as BrokerMode;
  if (mode !== "live" && mode !== "demo") {
    return NextResponse.json({ error: "Mode must be 'live' or 'demo'" }, { status: 400 });
  }

  // Use admin client to bypass RLS on profiles table
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ active_broker_mode: mode })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Revalidate dashboard pages so server components re-fetch with new mode
  revalidatePath("/dashboard", "layout");

  return NextResponse.json(
    { ok: true, mode },
    { headers: { "Cache-Control": "no-store, no-cache" } }
  );
}
