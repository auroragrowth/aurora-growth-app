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

  let body: { permanently?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body is fine */ }

  // Get current count
  const { data: profile } = await supabase
    .from("profiles")
    .select("quickstart_guide_shown_count")
    .eq("id", user.id)
    .single();

  const currentCount = profile?.quickstart_guide_shown_count ?? 0;

  const patch: Record<string, unknown> = {
    quickstart_guide_shown_count: currentCount + 1,
  };

  if (body.permanently) {
    patch.quickstart_guide_completed = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
