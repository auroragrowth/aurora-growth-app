"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAccountProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  const first_name = String(formData.get("first_name") || "").trim();
  const last_name = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const member_bio = String(formData.get("member_bio") || "").trim();

  const full_name = [first_name, last_name].filter(Boolean).join(" ").trim();

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    first_name,
    last_name,
    full_name,
    member_bio,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
}
