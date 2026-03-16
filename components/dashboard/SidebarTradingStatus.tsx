import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserTradingMode, getUserConnectionByMode } from "@/lib/trading212/connections";

export default async function SidebarTradingStatus() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tradingMode = await getUserTradingMode(user.id);
  const connection = await getUserConnectionByMode(user.id, tradingMode);

  const connected = !!connection;

  let label = "Not connected to Trading 212";
  let classes =
    "border border-red-500/30 bg-red-500/10 text-red-300";

  if (connected && tradingMode === "paper") {
    label = "Paper Trading";
    classes =
      "border border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  if (connected && tradingMode === "live") {
    label = "Live Trading";
    classes =
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return (
    <div className={`rounded-xl px-3 py-2 text-xs font-medium ${classes}`}>
      {label}
    </div>
  );
}
