import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserConnection } from "@/lib/trading212/connections";

export default async function SidebarTradingStatus() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const connection = await getUserConnection(user.id);
  const connected = !!connection?.is_connected;

  return (
    <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
      connected
        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : "border border-red-500/30 bg-red-500/10 text-red-300"
    }`}>
      {connected ? "Trading 212 Connected" : "Not connected to Trading 212"}
    </div>
  );
}
