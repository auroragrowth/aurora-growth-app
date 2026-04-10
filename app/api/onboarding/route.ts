import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = [
  "onboarding_step",
  "has_seen_welcome_popup",
  "has_seen_welcome",
  "has_seen_plan_selection",
  "has_completed_onboarding",
  "has_seen_trading212_prompt",
  "trading212_connected",
  "trading212_mode",
  "welcome_popup_shown_count",
  "onboarding_tour_completed",
  "onboarding_tour_completed_at",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Select only columns that are guaranteed to exist, then try extended columns
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, plan_key, subscription_status")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Use admin client so RLS can't interfere
  let extended: Record<string, unknown> = {};
  try {
    const { data: ext } = await supabaseAdmin
      .from("profiles")
      .select(
        "onboarding_step, has_seen_welcome_popup, has_seen_plan_selection, has_completed_onboarding, has_seen_trading212_prompt, trading212_connected, trading212_mode, has_completed_plan_selection, login_count, welcome_popup_shown_count, has_seen_welcome, onboarding_tour_completed, onboarding_tour_completed_at"
      )
      .eq("id", user.id)
      .single();
    if (ext) extended = ext;
  } catch {
    // Columns don't exist yet — that's fine
  }

  return NextResponse.json({ ok: true, ...profile, ...extended });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Partial<Record<AllowedField, unknown>> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      patch[field] = body[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
