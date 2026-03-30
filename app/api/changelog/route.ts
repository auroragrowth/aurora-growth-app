import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FALLBACK_CHANGELOG = [
  {
    id: "1",
    version: "1.1.0",
    title: "Market Scanner Overhaul",
    changes: [
      "Live animated sparklines on every stock row",
      "Ticker hover popup with TradingView chart and metrics",
      "Whole market search — press Enter to scan all markets",
      "Aurora Intelligence AI analysis on stock pages",
      "AI market overview banner on scanner dashboard",
      "Price alerts with Telegram notifications",
      "Watchlist source badges: Aurora Core, Aurora Alternative, My List",
      "Top bar live Trading 212 data with 30s polling",
      "GBP currency throughout the platform",
    ],
    released_at: "2026-03-28T00:00:00Z",
    is_major: false,
  },
  {
    id: "0",
    version: "1.0.0",
    title: "Aurora Growth Launch",
    changes: [
      "Dashboard with portfolio overview",
      "Market scanner with Core and Alternative lists",
      "Investment calculator with ladder entries",
      "Watchlist with real-time sync",
      "Trading 212 broker connection",
      "Stripe subscription billing",
    ],
    released_at: "2026-03-14T00:00:00Z",
    is_major: true,
  },
];

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ ok: true, entries: FALLBACK_CHANGELOG });
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("changelog")
      .select("*")
      .eq("is_published", true)
      .order("released_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ ok: true, entries: FALLBACK_CHANGELOG });
    }

    return NextResponse.json({ ok: true, entries: data });
  } catch {
    return NextResponse.json({ ok: true, entries: FALLBACK_CHANGELOG });
  }
}
