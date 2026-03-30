import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ shouldShow: false }, { status: 401 });
  }

  // Fetch profile flags
  let profile: Record<string, any> | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select(
        "has_completed_plan_selection, welcome_popup_shown_count, quickstart_guide_shown_count, quickstart_guide_completed, telegram_chat_id"
      )
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    return NextResponse.json({ shouldShow: false });
  }

  if (!profile) {
    return NextResponse.json({ shouldShow: false });
  }

  const planSelected = !!profile.has_completed_plan_selection;
  const welcomeDismissed = (profile.welcome_popup_shown_count ?? 0) >= 1;
  const shownCount = profile.quickstart_guide_shown_count ?? 0;
  const completed = !!profile.quickstart_guide_completed;

  const shouldShow = planSelected && welcomeDismissed && shownCount < 3 && !completed;

  // Check step completion
  // Step 2: scanner viewed
  let scannerViewed = false;
  try {
    const { count } = await supabase
      .from("user_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "scanner_view");
    scannerViewed = (count ?? 0) > 0;
  } catch { /* table may not have rows */ }

  // Step 3: watchlist has items
  let watchlistAdded = false;
  try {
    const { count } = await supabase
      .from("watchlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    watchlistAdded = (count ?? 0) > 0;
  } catch { /* ignore */ }

  // Step 4: calculator used
  let calculatorUsed = false;
  try {
    const { count } = await supabase
      .from("user_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "calculator_use");
    calculatorUsed = (count ?? 0) > 0;
  } catch { /* ignore */ }

  // Step 5: alerts setup (telegram + price_alerts)
  const hasTelegram = !!profile.telegram_chat_id;
  let hasAlerts = false;
  try {
    const { count } = await supabase
      .from("price_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    hasAlerts = (count ?? 0) > 0;
  } catch { /* ignore */ }

  const alertsSetup = hasTelegram && hasAlerts;
  const alertsPartial = (hasTelegram || hasAlerts) && !alertsSetup;

  const steps = {
    planSelected,
    scannerViewed,
    watchlistAdded,
    calculatorUsed,
    alertsSetup,
    alertsPartial,
  };

  const allComplete = planSelected && scannerViewed && watchlistAdded && calculatorUsed && alertsSetup;

  return NextResponse.json({
    shouldShow,
    shownCount,
    steps,
    allComplete,
  });
}
