import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { event_type: string; event_label: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.event_type || !body.event_label) {
    return NextResponse.json({ ok: false, error: "Missing event_type or event_label" }, { status: 400 });
  }

  await supabase.from("user_activity_log").insert({
    user_id: user.id,
    email: user.email || null,
    event_type: body.event_type,
    event_label: body.event_label,
    metadata: body.metadata || {},
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
