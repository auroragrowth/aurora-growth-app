import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendAdminAlert } from "@/lib/telegram/admin";

export default async function PostLoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch or create the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_key, has_completed_plan_selection")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // First login — create a bare profile and send to plan selection
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || null,
        role: "member",
      },
      { onConflict: "id" }
    );

    sendAdminAlert(
      `👤 New signup\nEmail: ${user.email}\nName: ${user.user_metadata?.full_name || "—"}`,
      "info"
    );

    redirect("/select-plan");
  }

  // Go to dashboard if user has a paid plan OR has completed plan selection
  const hasPlan =
    ["core", "pro", "elite"].includes(profile.plan_key ?? "") ||
    profile.has_completed_plan_selection === true;

  if (hasPlan) {
    redirect("/dashboard");
  }

  redirect("/select-plan");
}
