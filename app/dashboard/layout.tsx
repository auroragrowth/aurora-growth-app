import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BrokerConnectModal from "@/components/dashboard/BrokerConnectModal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
  } catch {
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.first_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  // Fetch profile for plan info — fallback gracefully
  let plan = "free";
  let planLabel = "Aurora Free";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, plan_key, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    plan = profile?.plan ?? profile?.plan_key ?? "free";
    planLabel =
      plan === "elite" ? "Aurora Elite" :
      plan === "pro" ? "Aurora Pro" :
      plan === "core" ? "Aurora Core" :
      "Aurora Free";
  } catch (err) {
    console.error("Failed to fetch profile in layout:", err);
  }

  // Check broker connection — fallback gracefully
  let brokerStatus = "Not connected to Trading 212";
  try {
    const { data: connections } = await supabase
      .from("broker_connections")
      .select("id, mode, is_active")
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("is_active", true);

    const hasConnection = (connections || []).length > 0;
    brokerStatus = hasConnection
      ? `Trading 212 connected (${(connections || []).map((c: any) => c.mode).join(", ")})`
      : "Not connected to Trading 212";
  } catch (err) {
    console.error("Failed to fetch broker connections in layout:", err);
  }

  return (
    <DashboardShell
      userName={fullName}
      userEmail={user.email || ""}
      lastLogin={user.last_sign_in_at}
      joinDate={user.created_at}
      planName={planLabel}
      brokerStatus={brokerStatus}
    >
      {children}
      <BrokerConnectModal />
    </DashboardShell>
  );
}
