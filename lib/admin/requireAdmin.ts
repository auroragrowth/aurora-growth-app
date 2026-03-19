import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/login");
  }

  const adminEmails = parseAdminEmails();
  const email = user.email.toLowerCase();

  if (!adminEmails.includes(email)) {
    redirect("/dashboard");
  }

  return { user, email };
}
