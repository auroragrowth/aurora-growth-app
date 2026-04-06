import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_tour_completed: true,
      onboarding_tour_completed_at: new Date().toISOString(),
      has_seen_welcome: true,
      welcome_popup_shown_count: 99,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
