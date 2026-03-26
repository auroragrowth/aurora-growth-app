import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan_key, plan, subscription_status, first_name, full_name")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const plan = profile?.plan_key ?? profile?.plan ?? "free";

    return NextResponse.json({
      ok: true,
      plan,
      subscription_status: profile?.subscription_status ?? null,
      first_name: profile?.first_name ?? null,
      full_name: profile?.full_name ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
