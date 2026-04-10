import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserConnection } from "@/lib/trading212/connections";
import { trading212Fetch, getTrading212AuthHeader } from "@/lib/trading212/client";
import { getBaseUrl } from "@/lib/trading212/connections";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramWithButtons } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

// Cache instruments per mode
const instrumentCache = new Map<string, { data: any[]; cachedAt: number }>();
const INST_CACHE_TTL = 300_000;

function clean(ticker: string) {
  return (ticker || "").replace(/_US_EQ$|_EQ$/, "").toUpperCase();
}

async function getInstrumentNames(connection: any): Promise<Record<string, string>> {
  const mode = connection.mode || "live";
  const cached = instrumentCache.get(mode);
  const nameMap: Record<string, string> = {};

  let instruments: any[] = [];
  if (cached && Date.now() - cached.cachedAt < INST_CACHE_TTL) {
    instruments = cached.data;
  } else {
    try {
      const baseUrl = connection.base_url || getBaseUrl(mode);
      const auth = getTrading212AuthHeader(connection);
      const res = await fetch(`${baseUrl}/equity/metadata/instruments`, {
        headers: { Authorization: auth },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          instruments = data;
          instrumentCache.set(mode, { data: instruments, cachedAt: Date.now() });
        }
      }
    } catch {}
  }

  for (const inst of instruments) {
    if (inst.ticker) {
      nameMap[inst.ticker] = inst.shortName || inst.name || inst.ticker;
    }
  }
  return nameMap;
}

type HistoryOrder = {
  id: number;
  ticker: string;
  type: string;
  status: string;
  limitPrice: number | null;
  stopPrice: number | null;
  quantity: number | null;
  filledQuantity: number | null;
  filledValue: number | null;
  fillPrice: number | null;
  fillResult: { quantity: number; price: number } | null;
  dateCreated: string;
  dateExecuted: string | null;
  dateModified: string | null;
};

type HistoryResponse = {
  items: HistoryOrder[];
  nextPagePath: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const connection = await getUserConnection(user.id);

    if (!connection?.api_key_encrypted || !connection.is_connected) {
      return NextResponse.json({
        connected: false,
        error: "Trading 212 not connected",
        positions: [],
      });
    }

    // Fetch all T212 data in parallel
    const [positions, pendingOrders, historyPage1, cashData, nameMap] =
      await Promise.all([
        trading212Fetch<any[]>(connection, "/equity/portfolio").catch(() => []),
        trading212Fetch<any[]>(connection, "/equity/orders").catch(() => []),
        trading212Fetch<HistoryResponse>(connection, "/equity/history/orders").catch(
          () => ({ items: [], nextPagePath: null })
        ),
        trading212Fetch<any>(connection, "/equity/account/cash").catch(() => null),
        getInstrumentNames(connection),
      ]);

    // Fetch additional history pages
    const allHistory: HistoryOrder[] = [
      ...(historyPage1?.items || []),
    ];
    let nextPath = historyPage1?.nextPagePath || null;
    let pages = 1;
    while (nextPath && pages < 3) {
      try {
        const page = await trading212Fetch<HistoryResponse>(connection, nextPath);
        if (page?.items) allHistory.push(...page.items);
        nextPath = page?.nextPagePath || null;
        pages++;
      } catch {
        break;
      }
    }

    // Get watchlist for company names fallback
    const mode = connection.mode || "live";
    const table = mode === "demo" ? "watchlist_demo" : "watchlist_live";
    const { data: watchlist } = await supabaseAdmin
      .from(table)
      .select("symbol, company_name")
      .eq("user_id", user.id);

    const watchMap: Record<string, string> = {};
    for (const w of watchlist || []) {
      if (w.symbol && w.company_name) watchMap[w.symbol.toUpperCase()] = w.company_name;
    }

    // Get local orders from DB (for calculator/ladder data)
    const { data: localOrders } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("account_mode", mode)
      .order("placed_at", { ascending: true });

    // Process positions
    const safePositions = Array.isArray(positions) ? positions : [];
    const safePending = Array.isArray(pendingOrders) ? pendingOrders : [];

    const enriched = safePositions.map((pos: any) => {
      const rawTicker = pos.ticker || "";
      const symbol = clean(rawTicker);

      // Company name: instrument metadata > watchlist > raw ticker
      const company =
        nameMap[rawTicker] || watchMap[symbol] || symbol;

      // T212 order history for this ticker
      const tickerHistory = allHistory.filter(
        (o) => clean(o.ticker) === symbol
      );
      const filledOrders = tickerHistory
        .filter(
          (o) =>
            o.status === "Filled" ||
            o.status === "FILLED" ||
            o.status === "Executed"
        )
        .sort(
          (a, b) =>
            new Date(a.dateCreated).getTime() -
            new Date(b.dateCreated).getTime()
        );
      const cancelledOrders = tickerHistory.filter(
        (o) =>
          o.status === "Cancelled" ||
          o.status === "CANCELLED" ||
          o.status === "Rejected"
      );

      // T212 pending orders for this ticker
      const tickerPending = safePending.filter(
        (o: any) => clean(o.ticker) === symbol
      );

      // Local DB orders (calculator/ladder)
      const localTickerOrders = (localOrders || []).filter(
        (o) => o.ticker?.toUpperCase() === symbol
      );
      const ladderPlan = localTickerOrders.find(
        (o) => o.ladder_plan
      )?.ladder_plan;
      const bepPrice = localTickerOrders.find((o) => o.bep_price)?.bep_price;

      // Position numbers
      const qty = parseFloat(pos.quantity || "0");
      const avg = parseFloat(pos.averagePrice || "0");
      const cur = parseFloat(pos.currentPrice || "0");
      const ppl = parseFloat(pos.ppl || "0");
      const fxPpl = parseFloat(pos.fxPpl || "0");
      const totalInvested = qty * avg;
      const currentValue = qty * cur;
      const pnlPct = totalInvested > 0 ? (ppl / totalInvested) * 100 : 0;

      // First buy date
      const firstFilled = filledOrders[0];
      const firstDate =
        firstFilled?.dateExecuted ||
        firstFilled?.dateCreated ||
        pos.initialFillDate ||
        null;
      const daysInvested = firstDate
        ? Math.floor(
            (Date.now() - new Date(firstDate).getTime()) / 86400000
          )
        : 0;

      // Profit targets from avg price
      const profitTargets = [10, 15, 20, 25].map((pctTarget) => ({
        pct: pctTarget,
        price: avg * (1 + pctTarget / 100),
        value: totalInvested * (1 + pctTarget / 100),
        profit: totalInvested * (pctTarget / 100),
        reached_at: null as string | null,
      }));

      // Remaining ladder levels
      const remainingLevels =
        ladderPlan && Array.isArray(ladderPlan)
          ? ladderPlan.filter(
              (l: any) => !l.filled && l.price < cur * 0.99
            ).length
          : null;

      return {
        symbol,
        company,
        ticker_t212: rawTicker,
        quantity: qty,
        avg_price: avg,
        current_price: cur,
        total_invested: totalInvested,
        current_value: currentValue,
        pnl: ppl,
        pnl_pct: pnlPct,
        fx_pnl: fxPpl,
        days_invested: daysInvested,
        first_invested_at: firstDate,
        filled_orders: filledOrders.map((o) => ({
          id: o.id,
          type: o.type,
          quantity: o.filledQuantity || o.quantity || 0,
          filled_price:
            o.fillPrice || o.fillResult?.price || o.limitPrice || 0,
          limit_price: o.limitPrice || 0,
          total_value: o.filledValue || 0,
          date: o.dateExecuted || o.dateCreated,
          status: o.status,
        })),
        cancelled_orders: cancelledOrders.length,
        pending_orders: tickerPending.map((o: any) => ({
          id: o.id,
          type: o.type,
          quantity: o.quantity || 0,
          limit_price: o.limitPrice || 0,
          stop_price: o.stopPrice || null,
          total_value:
            (o.quantity || 0) * (o.limitPrice || 0),
          date: o.creationTime || o.dateCreated,
          status: o.status,
        })),
        bep_price: bepPrice || null,
        ladder_plan: ladderPlan || null,
        remaining_levels: remainingLevels,
        profit_targets: profitTargets,
      };
    });

    // Sort by current value descending
    enriched.sort((a, b) => b.current_value - a.current_value);

    // Track profit target hits
    const { data: existingHits } = await supabaseAdmin
      .from("profit_target_hits")
      .select("*")
      .eq("user_id", user.id)
      .eq("account_mode", mode);

    const hitsMap = new Map<string, { target_pct: number; reached_at: string }[]>();
    for (const h of existingHits || []) {
      const key = h.symbol;
      if (!hitsMap.has(key)) hitsMap.set(key, []);
      hitsMap.get(key)!.push({ target_pct: h.target_pct, reached_at: h.reached_at });
    }

    const newHits: {
      user_id: string;
      symbol: string;
      account_mode: string;
      target_pct: number;
      reached_at: string;
      avg_price_at_hit: number;
      current_price_at_hit: number;
    }[] = [];

    for (const pos of enriched) {
      const posHits = hitsMap.get(pos.symbol) || [];
      for (const target of pos.profit_targets) {
        const existingHit = posHits.find((h) => h.target_pct === target.pct);
        if (existingHit) {
          target.reached_at = existingHit.reached_at;
        } else if (pos.current_price >= target.price) {
          const now = new Date().toISOString();
          target.reached_at = now;
          newHits.push({
            user_id: user.id,
            symbol: pos.symbol,
            account_mode: mode,
            target_pct: target.pct,
            reached_at: now,
            avg_price_at_hit: pos.avg_price,
            current_price_at_hit: pos.current_price,
          });
        }
      }
    }

    if (newHits.length > 0) {
      try {
        await supabaseAdmin
          .from("profit_target_hits")
          .upsert(newHits, { onConflict: "user_id,symbol,account_mode,target_pct" });
      } catch {}

      // Send Telegram alerts for newly hit targets
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.telegram_chat_id) {
        const chatId = profile.telegram_chat_id;

        for (const hit of newHits) {
          const pos = enriched.find((p) => p.symbol === hit.symbol);
          if (!pos) continue;

          let msg = "";
          const buttons: { text: string; callback_data: string }[][] = [];

          const icons: Record<number, string> = { 10: "🎯", 15: "🚀", 20: "💰", 25: "🏆" };
          const icon = icons[hit.target_pct] || "📈";

          // Calculate stop loss price for this target level
          let stopPrice = pos.avg_price;
          if (hit.target_pct === 10 && pos.bep_price) {
            stopPrice = pos.bep_price + 5;
          } else if (hit.target_pct === 15) {
            stopPrice = pos.avg_price * 1.1 + 1; // $1 above 10%
          } else if (hit.target_pct === 20) {
            stopPrice = pos.avg_price * 1.15 + 1; // $1 above 15%
          } else if (hit.target_pct === 25) {
            stopPrice = pos.avg_price * 1.2 + 1; // $1 above 20%
          }

          msg =
            `${icon} *${hit.symbol} — ${hit.target_pct}% Profit Target Hit!*\n\n` +
            `Current: $${pos.current_price.toFixed(2)}\n` +
            `Target: $${(pos.avg_price * (1 + hit.target_pct / 100)).toFixed(2)}\n` +
            `Avg Price: $${pos.avg_price.toFixed(2)}\n` +
            `Shares: ${pos.quantity}\n\n` +
            `Suggested: Add stop loss @ $${stopPrice.toFixed(2)}`;

          buttons.push([
            {
              text: `🛡 Add Stop Loss @ $${stopPrice.toFixed(2)}`,
              callback_data: `stoploss:${hit.symbol}:${pos.quantity}:${stopPrice.toFixed(2)}:${mode}`,
            },
          ]);

          if (msg) {
            buttons.push([
              {
                text: `📊 View in Aurora`,
                callback_data: `view:${hit.symbol}`,
              },
            ]);
            await sendTelegramWithButtons(chatId, msg, buttons);
          }
        }

        // Also check BEP hit for positions that just crossed above BEP
        for (const pos of enriched) {
          if (
            pos.bep_price &&
            pos.current_price >= pos.bep_price &&
            pos.current_price < pos.bep_price * 1.02
          ) {
            // Only alert if no profit targets hit yet (BEP is below 10%)
            const anyTargetHit = pos.profit_targets.some(
              (t) => t.reached_at !== null
            );
            if (!anyTargetHit) {
              const msg =
                `🎯 *${pos.symbol} — Break-Even Price Reached!*\n\n` +
                `BEP: $${pos.bep_price.toFixed(2)}\n` +
                `Current: $${pos.current_price.toFixed(2)}\n` +
                `You're now in profit territory!`;
              await sendTelegramWithButtons(chatId, msg, [
                [
                  {
                    text: `📊 View in Aurora`,
                    callback_data: `view:${pos.symbol}`,
                  },
                ],
              ]);
            }
          }
        }
      }
    }

    return NextResponse.json({
      connected: true,
      mode,
      account: cashData,
      positions: enriched,
      total_positions: enriched.length,
      total_value: enriched.reduce((s, p) => s + p.current_value, 0),
      total_invested: enriched.reduce((s, p) => s + p.total_invested, 0),
      total_pnl: enriched.reduce((s, p) => s + p.pnl, 0),
    });
  } catch (e: any) {
    console.error("[Broker Investments]", e.message);
    return NextResponse.json(
      { connected: false, error: e.message, positions: [] },
      { status: 500 }
    );
  }
}
