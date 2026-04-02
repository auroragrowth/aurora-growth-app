import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { text: string; ts: number }>();

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  // Check in-memory cache
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({
      ok: true,
      ticker,
      analysis: cached.text,
      cached: true,
      updated_at: new Date(cached.ts).toISOString(),
    });
  }

  // Get stock data from scanner_results
  let stockData: any = null;
  try {
    const { data } = await supabaseAdmin
      .from("scanner_results")
      .select("*")
      .eq("ticker", ticker)
      .maybeSingle();
    stockData = data;
  } catch {
    // non-fatal
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    // No API key — return fallback analysis
    const fallback = buildFallback(ticker, stockData);
    return NextResponse.json({
      ok: true,
      ticker,
      analysis: fallback,
      cached: false,
      updated_at: new Date().toISOString(),
    });
  }

  const prompt = buildPrompt(ticker, stockData);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: "You are Aurora Intelligence, an expert investment analyst for the Aurora Growth platform. Write structured stock analysis. Be concise, insightful and data-driven. Never give direct buy/sell advice. Use professional language.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini intelligence error:", err);
      const fallback = buildFallback(ticker, stockData);
      return NextResponse.json({
        ok: true,
        ticker,
        analysis: fallback,
        cached: false,
        updated_at: new Date().toISOString(),
      });
    }

    const data = await res.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      const fallback = buildFallback(ticker, stockData);
      return NextResponse.json({
        ok: true,
        ticker,
        analysis: fallback,
        cached: false,
        updated_at: new Date().toISOString(),
      });
    }

    // Cache the result
    cache.set(ticker, { text: analysis, ts: Date.now() });

    return NextResponse.json({
      ok: true,
      ticker,
      analysis,
      cached: false,
      updated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Intelligence route error:", err.message);
    const fallback = buildFallback(ticker, stockData);
    return NextResponse.json({
      ok: true,
      ticker,
      analysis: fallback,
      cached: false,
      updated_at: new Date().toISOString(),
    });
  }
}

function buildPrompt(ticker: string, data: any): string {
  if (!data) {
    return `Analyse the stock ${ticker}. Provide a brief 4-section analysis covering Momentum, Fundamentals, Opportunity, and Risk. Keep each section 2-3 sentences.`;
  }

  return `Analyse ${ticker} (${data.company_name || data.company || ticker}):
- Aurora Score: ${data.score ?? data.aurora_score ?? "N/A"}/30
- Sector: ${data.sector || "Unknown"}
- Price: $${data.price || "N/A"}
- Change: ${data.change_percent || 0}%
- Market Cap: ${data.market_cap || "N/A"}
- ROE: ${data.roe || "N/A"}%, ROA: ${data.roa || "N/A"}%, ROI: ${data.roi || "N/A"}%
- EPS This Year: ${data.eps_this_y || "N/A"}%, EPS Next Year: ${data.eps_next_y || "N/A"}%
- PEG: ${data.peg || "N/A"}
- Current Ratio: ${data.current_ratio || "N/A"}, Debt/Equity: ${data.debt_eq || "N/A"}
- Trend: ${data.trend || "flat"}

Write a concise 4-section analysis:

## Momentum
2-3 sentences on price momentum and trend.

## Fundamentals
2-3 sentences on financial health and growth.

## Opportunity
2-3 sentences on the investment opportunity and Aurora ladder setup.

## Risk
1-2 sentences on key risks to monitor.`;
}

function buildFallback(ticker: string, data: any): string {
  if (!data) {
    return `## Momentum\n${ticker} is currently being tracked by Aurora Intelligence. Price data is being gathered.\n\n## Fundamentals\nFundamental metrics are being loaded. Check back shortly for a full analysis.\n\n## Opportunity\nUse the Aurora Ladder Calculator to plan staged entries once data is available.\n\n## Risk\nAlways use position sizing and staged entries to manage downside risk.`;
  }

  const score = data.score ?? data.aurora_score ?? 0;
  const change = data.change_percent ?? 0;
  const company = data.company_name || data.company || ticker;

  let momentum = "showing neutral momentum";
  if (score >= 25) momentum = "showing strong bullish momentum";
  else if (score >= 18) momentum = "building positive momentum";
  else if (score >= 12) momentum = "showing early signs of momentum";

  const direction = change > 0 ? "positive" : change < 0 ? "negative" : "flat";

  return `## Momentum\n${company} is ${momentum} with an Aurora score of ${score}/30. Recent price action is ${direction} at ${Number(change).toFixed(2)}%.\n\n## Fundamentals\n${
    data.roe ? `ROE of ${data.roe}% ` : ""
  }${data.current_ratio ? `with a current ratio of ${data.current_ratio}` : "Fundamental data available in the scanner"}. ${
    score >= 22 ? "The balance sheet supports the current growth trajectory." : "Monitor fundamentals for improvement before increasing exposure."
  }\n\n## Opportunity\n${
    score >= 25
      ? "Strong Aurora score suggests this is a high-conviction setup. Consider the Ladder Calculator for staged entries at support levels."
      : score >= 18
        ? "Building momentum — use the Ladder Calculator to plan entries if the stock pulls back to support."
        : "Wait for stronger momentum confirmation. Set a price alert to track key levels."
  }\n\n## Risk\n${
    data.debt_eq && Number(data.debt_eq) > 1
      ? `Elevated debt/equity ratio of ${data.debt_eq} warrants caution. `
      : ""
  }Always use staged entries and position sizing to manage downside risk.`;
}
