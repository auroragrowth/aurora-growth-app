import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET — list all users with key fields
export async function GET() {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, first_name, full_name, plan_key, subscription_status, is_admin, is_suspended, suspended_reason, telegram_connected, trading212_connected, created_at, last_login_at"
      )
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — user management actions
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { action, userId, email, reason } = body;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    // Send password reset email
    if (action === "reset_password") {
      const targetEmail = email || body.targetEmail;
      if (!targetEmail) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
        targetEmail,
        { redirectTo: "https://app.auroragrowth.co.uk/reset-password" }
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({
        success: true,
        message: `Password reset email sent to ${targetEmail}`,
      });
    }

    // Suspend user
    if (action === "suspend") {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: reason || "Suspended by admin",
        })
        .eq("id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Also disable their Supabase auth account
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years
      });

      return NextResponse.json({ success: true, message: "User suspended" });
    }

    // Unsuspend user
    if (action === "unsuspend") {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq("id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });

      return NextResponse.json({ success: true, message: "User unsuspended" });
    }

    // Update user plan manually
    if (action === "set_plan") {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { plan } = body;
      if (!plan) return NextResponse.json({ error: "plan required" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_key: plan,
          subscription_status: "active",
        })
        .eq("id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, message: `Plan set to ${plan}` });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
