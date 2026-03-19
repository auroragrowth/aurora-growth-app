import { NextResponse } from "next/server";

type Body = {
  email?: string | null;
  user_id?: string | null;
  event_type?: string | null;
  event_label?: string | null;
  metadata?: Record<string, unknown> | null;
  update_last_seen?: boolean;
  update_last_login?: boolean;
  update_password_changed?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase config" },
        { status: 500 }
      );
    }

    const headers = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    const now = new Date().toISOString();

    if (body.event_type || body.event_label) {
      await fetch(`${supabaseUrl}/rest/v1/user_activity_log`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: body.user_id || null,
          email: body.email || null,
          event_type: body.event_type || "event",
          event_label: body.event_label || "Activity logged",
          metadata: body.metadata || {},
          created_at: now,
        }),
      });
    }

    if (body.user_id) {
      const patch: Record<string, string> = {};

      if (body.update_last_seen) patch.last_seen_at = now;
      if (body.update_last_login) patch.last_login_at = now;
      if (body.update_password_changed) patch.password_changed_at = now;

      if (Object.keys(patch).length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${body.user_id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(patch),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin activity route error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
