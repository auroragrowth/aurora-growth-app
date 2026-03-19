import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTrading212Summary } from "@/lib/trading212/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { connected, summary } = await fetchTrading212Summary();

    if (!connected || !summary) {
      return NextResponse.json({
        ok: true,
        connected: false,
        summary: null,
      });
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      summary: {
        accountId: summary.accountId ?? "Trading 212",
        currencyCode: summary.currencyCode ?? "GBP",
        total: Number(summary.total ?? (summary as any).equity ?? 0),
        invested: Number(summary.invested ?? (summary as any).pieValue ?? 0),
        freeCash: Number(summary.freeCash ?? (summary as any).cash ?? 0),
        result: Number(
          summary.result ?? (summary as any).unrealisedProfitLoss ?? 0
        ),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Trading 212 summary",
      },
      { status: 500 }
    );
  }
}
