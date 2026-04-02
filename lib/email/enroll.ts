import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type EnrollArgs = {
  userId: string;
  email: string;
  firstName?: string | null;
};

export async function enrollLeadFlow({ userId, email, firstName }: EnrollArgs) {
  const { error } = await supabase
    .from("email_automation_state")
    .upsert(
      {
        user_id: userId,
        email,
        first_name: firstName ?? null,
        flow: "lead",
        current_step: 0,
        next_send_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}
