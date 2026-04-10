import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ notifications: [] }, { status: 401 });

    const { data } = await supabaseAdmin
      .from("in_app_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ notifications: data || [] });
  } catch {
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}

// Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      await supabaseAdmin
        .from("in_app_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    } else if (id) {
      await supabaseAdmin
        .from("in_app_notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
