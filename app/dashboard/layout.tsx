import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BrokerConnectModal from "@/components/dashboard/BrokerConnectModal";
import { BrokerPopupProvider } from "@/components/providers/BrokerPopupProvider";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

  // Fetch profile for plan info + full_name — fallback gracefully
  let fullName =
    user.email?.split("@")[0] ||
    "User";
  let plan = "free";
  let planLabel = "Aurora Free";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, plan, plan_key, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.full_name) {
      fullName = profile.full_name;
    } else {
      fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        (user.user_metadata?.first_name as string | undefined) ||
        fullName;
    }

    plan = profile?.plan ?? profile?.plan_key ?? "free";
    planLabel =
      plan === "elite" ? "Aurora Elite" :
      plan === "pro" ? "Aurora Pro" :
      plan === "core" ? "Aurora Core" :
      "Aurora Free";
  } catch (err) {
    console.error("Failed to fetch profile in layout:", err);
  }

  // ── Broker connection status ──────────────────────────────
  let brokerStatus = "Disconnected";
  let brokerConnected = false;
  let showBrokerPopup = false;

  try {
    const { data: connection } = await supabaseAdmin
      .from("trading212_connections")
      .select("id, is_connected")
      .eq("user_id", user.id)
      .eq("broker", "trading212")
      .eq("is_active", true)
      .maybeSingle();

    if (connection) {
      // User has a connection row — never show popup
      brokerConnected = !!connection.is_connected;
      brokerStatus = brokerConnected ? "Connected" : "Disconnected";
    } else {
      // No connection row — check if popup was dismissed
      let dismissed = false;
      try {
        const { data: flags } = await supabaseAdmin
          .from("profiles")
          .select("has_seen_trading212_prompt, trading212_connected")
          .eq("id", user.id)
          .maybeSingle();
        dismissed = !!(flags?.has_seen_trading212_prompt || flags?.trading212_connected);
      } catch { /* columns may not exist */ }

      showBrokerPopup = !dismissed;
    }
  } catch (err) {
    console.error("Failed to check trading212 in layout:", err);
  }

  return (
    <BrokerPopupProvider>
      <DashboardShell
        userName={fullName}
        userEmail={user.email || ""}
        lastLogin={user.last_sign_in_at}
        joinDate={user.created_at}
        planName={planLabel}
        brokerStatus={brokerStatus}
        brokerConnected={brokerConnected}
      >
        {children}
        {showBrokerPopup && <BrokerConnectModal />}
      </DashboardShell>
    </BrokerPopupProvider>
  );
}
