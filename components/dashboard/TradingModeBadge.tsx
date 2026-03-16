import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserTradingMode } from "@/lib/trading212/connections";

export default async function TradingModeBadge() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tradingMode = await getUserTradingMode(user.id);

  return (
    <div
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        tradingMode === "paper"
          ? "bg-amber-100 text-amber-900"
          : "bg-emerald-100 text-emerald-900"
      }`}
    >
      {tradingMode === "paper" ? "Paper Mode" : "Live Mode"}
    </div>
  );
}
