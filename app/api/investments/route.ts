import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ticker, company, amount, shares, avgPrice } = body;

    if (!userId || !ticker || !amount) {
      return NextResponse.json(
        { error: "Missing userId, ticker or amount" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("investments")
      .upsert(
        {
          user_id: userId,
          ticker,
          company,
          amount: Number(amount),
          shares: shares ? Number(shares) : null,
          avg_price: avgPrice ? Number(avgPrice) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,ticker" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save investment" }, { status: 500 });
  }
}
