import { createClient } from "@/lib/supabase/server"

export async function hasActiveSubscription() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_key, subscription_status")
    .eq("id", user.id)
    .single()

  if (!profile) return false

  return (
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing"
  )
}

