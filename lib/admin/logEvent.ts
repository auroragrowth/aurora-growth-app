import { createClient } from "@/lib/supabase/server";

type LogEventArgs = {
  event_type: string;
  event_label: string;
  metadata?: Record<string, unknown>;
  update_last_seen?: boolean;
  update_last_login?: boolean;
  update_password_changed?: boolean;
};

export async function logEvent({
  event_type,
  event_label,
  metadata = {},
  update_last_seen = false,
  update_last_login = false,
  update_password_changed = false,
}: LogEventArgs) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    await supabase.from("user_activity_log").insert({
      user_id: user?.id || null,
      email: user?.email || null,
      event_type,
      event_label,
      metadata,
      created_at: now,
    });

    if (user?.id) {
      const patch: Record<string, string> = {};

      if (update_last_seen) patch.last_seen_at = now;
      if (update_last_login) patch.last_login_at = now;
      if (update_password_changed) patch.password_changed_at = now;

      if (Object.keys(patch).length > 0) {
        await supabase.from("profiles").update(patch).eq("id", user.id);
      }
    }
  } catch (error) {
    console.error("logEvent error", error);
  }
}
