"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortfolio, usePortfolioHelpers, type Position } from "@/components/providers/PortfolioProvider";
import MarketCountdown from "@/components/dashboard/MarketCountdown";

type SortKey =
  | "ticker"
  | "company"
  | "qty"
  | "avgPrice"
  | "current"
  | "cost"
  | "value"
  | "pnl"
  | "return"
  | "aurora";

type OrderRow = {
  id: string;
  ticker: string;
  broker_ticker?: string;
  order_type: string;
  order_mode: string;
  quantity: number;
  limit_price: number;
  status: string;
  placed_at: string;
  ladder_step?: number | null;
  notes?: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$£€,%\s,]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function moneyUSD(value: unknown): string {
  const num = toNumber(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function qtyFormat(value: unknown): string {
  const num = toNumber(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(num);
}

function pct(value: unknown): string {
  const num = toNumber(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function pickText(value: unknown, keys: string[] = []): string {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      const candidate = obj[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "";
}

function getRawTicker(row: Position): string {
  return (
    pickText(row.ticker) ||
    pickText(row.symbol) ||
    pickText(row.instrument, ["ticker", "symbol", "epic", "code", "name"]) ||
    "-"
  );
}

function cleanTicker(raw: string): string {
  if (!raw || raw === "-") return "-";

  return raw
    .replace(/_US_EQ$/i, "")
    .replace(/_EQ$/i, "")
    .replace(/_LN$/i, "")
    .replace(/\.L$/i, "")
    .replace(/-USD$/i, "")
    .trim();
}

function getTicker(row: Position): string {
  return cleanTicker(getRawTicker(row));
}

function getCompany(row: Position): string {
  return (
    pickText(row.company_name) ||
    pickText(row.name) ||
    pickText(row.instrument, ["name", "company_name", "shortName", "ticker"]) ||
    "-"
  );
}

function getCurrency(row: Position): string {
  return (
    pickText(row.instrument, ["currency"]) ||
    pickText((row as Record<string, unknown>).currency) ||
    "USD"
  ).toUpperCase();
}

function getAurora(row: Position): number {
  return toNumber(row.aurora_score ?? row.aurora);
}

export default function InvestmentsPage() {
  const { data } = usePortfolio();
  const {
    getQty,
    getAvgPrice,
    getCurrent,
    getCost,
    getValue,
    getPnL,
    getReturn,
  } = usePortfolioHelpers();

  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [demoOrders, setDemoOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const isDemo = data.brokerMode === "demo";
  const positions = Array.isArray(data.positions) ? data.positions : [];

  // Fetch demo orders when in demo mode
  useEffect(() => {
    if (!isDemo) {
      setDemoOrders([]);
      return;
    }
    setOrdersLoading(true);
    fetch("/api/broker/orders?mode=demo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((json) => setDemoOrders(Array.isArray(json?.orders) ? json.orders : []))
      .catch(() => setDemoOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [isDemo]);

  const switchToLive = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "live" }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("aurora:broker-mode-changed", { detail: "live" }));
        window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
        window.dispatchEvent(new CustomEvent("aurora:toast", {
          detail: { id: "mode-live", title: "Switched to Live Account", tone: "success" },
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const totals = useMemo(() => {
    const totalCost =
      toNumber(data.overview?.total_cost) ||
      positions.reduce((sum, row) => sum + getCost(row), 0);

    const totalValue =
      toNumber(data.overview?.portfolio_value ?? data.overview?.total_value) ||
      positions.reduce((sum, row) => sum + getValue(row), 0);

    const totalPnL =
      toNumber(data.overview?.total_pnl) || (totalValue - totalCost);

    const totalReturn =
      toNumber(data.overview?.total_return_pct) ||
      (totalCost ? (totalPnL / totalCost) * 100 : 0);

    return {
      totalCost,
      totalValue,
      totalPnL,
      totalReturn,
    };
  }, [data.overview, positions, getCost, getValue]);

  const sortedPositions = useMemo(() => {
    const copy = [...positions];

    function getSortValue(row: Position, key: SortKey): string | number {
      switch (key) {
        case "ticker":
          return getTicker(row).toLowerCase();
        case "company":
          return getCompany(row).toLowerCase();
        case "qty":
          return getQty(row);
        case "avgPrice":
          return getAvgPrice(row);
        case "current":
          return getCurrent(row);
        case "cost":
          return getCost(row);
        case "value":
          return getValue(row);
        case "pnl":
          return getPnL(row);
        case "return":
          return getReturn(row);
        case "aurora":
          return getAurora(row);
        default:
          return 0;
      }
    }

    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      const direction = sortDirection === "asc" ? 1 : -1;

      if (typeof aVal === "string" || typeof bVal === "string") {
        return textValue(aVal).localeCompare(textValue(bVal)) * direction;
      }

      return (toNumber(aVal) - toNumber(bVal)) * direction;
    });

    return copy;
  }, [
    positions,
    sortKey,
    sortDirection,
    getQty,
    getAvgPrice,
    getCurrent,
    getCost,
    getValue,
    getPnL,
    getReturn,
  ]);

  const topHoldings = useMemo(
    () => sortedPositions.slice().sort((a, b) => getValue(b) - getValue(a)).slice(0, 5),
    [sortedPositions, getValue]
  );

  const bestPerformer = useMemo(() => {
    if (!positions.length) return null;
    return [...positions].sort((a, b) => getPnL(b) - getPnL(a))[0];
  }, [positions, getPnL]);

  const worstPerformer = useMemo(() => {
    if (!positions.length) return null;
    return [...positions].sort((a, b) => getPnL(a) - getPnL(b))[0];
  }, [positions, getPnL]);

  const auroraScore = useMemo(() => {
    if (!positions.length) return 0;
    const scored = positions.filter((row) => getAurora(row) > 0);
    if (!scored.length) return 0;
    const total = scored.reduce((sum, row) => sum + getAurora(row), 0);
    return Math.round(total / scored.length);
  }, [positions]);

  const winners = positions.filter((row) => getPnL(row) >= 0).length;
  const losers = positions.filter((row) => getPnL(row) < 0).length;
  const conviction =
    auroraScore >= 75 ? "High" : auroraScore >= 60 ? "Medium" : "Low";

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "ticker" || key === "company" ? "asc" : "desc");
  }

  // Accent colours based on mode
  const accent = isDemo ? "amber" : "cyan";
  const accentBorder = isDemo ? "border-amber-500/12" : "border-cyan-500/12";
  const accentText = isDemo ? "text-amber-300" : "text-cyan-300";
  const accentBadgeBg = isDemo ? "bg-amber-400/10" : "bg-cyan-400/10";
  const accentBadgeBorder = isDemo ? "border-amber-400/20" : "border-cyan-400/20";
  const accentBadgeText = isDemo ? "text-amber-200" : "text-cyan-200";

  function SortHeader({
    label,
    column,
    align = "left",
  }: {
    label: string;
    column: SortKey;
    align?: "left" | "right" | "center";
  }) {
    const active = sortKey === column;
    const arrow = active ? (sortDirection === "asc" ? "▲" : "▼") : "↕";

    return (
      <th
        className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDemo ? "text-amber-100/80" : "text-cyan-100/80"} ${
          align === "right"
            ? "text-right"
            : align === "center"
            ? "text-center"
            : "text-left"
        }`}
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={`inline-flex items-center gap-2 rounded-md transition ${
            active ? accentText : "hover:text-white"
          }`}
        >
          <span>{label}</span>
          <span className="text-[10px]">{arrow}</span>
        </button>
      </th>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <MarketCountdown />

      {/* Demo mode top banner */}
      {isDemo && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">🟡</span>
              <div>
                <div className="text-sm font-semibold text-amber-300">DEMO MODE — Practice Account</div>
                <div className="mt-1 text-sm text-amber-300/70">
                  You are viewing your practice account. All figures shown are from your demo account.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={switchToLive}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
            >
              Switch to Live Account
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      <section className={`rounded-[32px] border ${accentBorder} bg-[radial-gradient(circle_at_top_left,${isDemo ? "rgba(245,158,11,0.08)" : "rgba(34,211,238,0.08)"},transparent_26%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_22%),linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]`}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              {isDemo ? "Demo Investments" : "Your investments in Trading 212"}
              {isDemo && (
                <span className="ml-3 inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
                  DEMO
                </span>
              )}
            </h1>
            <p className="mt-3 text-base text-slate-300">
              {isDemo
                ? "Practice portfolio — demo positions and performance overlays."
                : "Live portfolio view with Aurora ranking and performance overlays."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className={`rounded-full border px-5 py-2.5 text-sm ${accentBadgeBorder} ${accentBadgeBg} ${accentBadgeText}`}>
              {isDemo ? "Demo account" : "Live refresh every 30s"}
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-slate-300">
              Last updated:{" "}
              {data.updatedAt
                ? new Date(data.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </div>
          </div>
        </div>

        {data.error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {data.error}
          </div>
        ) : null}

        {/* Portfolio overview cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Portfolio value"
            value={moneyUSD(totals.totalValue)}
            sublabel={isDemo ? "Demo account" : "Live valuation"}
            isDemo={isDemo}
          />
          <StatCard
            label="Invested"
            value={moneyUSD(totals.totalCost)}
            sublabel="Cost basis"
            isDemo={isDemo}
          />
          <StatCard
            label="Profit / loss"
            value={`${totals.totalPnL >= 0 ? "+" : ""}${moneyUSD(totals.totalPnL)}`}
            sublabel="Real-time P/L"
            positive={totals.totalPnL >= 0}
            isDemo={isDemo}
          />
          <StatCard
            label="Return"
            value={pct(totals.totalReturn)}
            sublabel="Portfolio efficiency"
            positive={totals.totalReturn >= 0}
            isDemo={isDemo}
          />
        </div>

        {/* No positions empty state for demo */}
        {isDemo && positions.length === 0 && !data.loading && (
          <div className="mt-8 rounded-[28px] border border-amber-400/15 bg-amber-400/[0.03] p-8 text-center">
            <h3 className="text-xl font-semibold text-white">No demo positions yet</h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
              Use the Make Investment button on any stock chart page to place practice orders.
            </p>
            <Link
              href="/dashboard/market-scanner"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-6 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
            >
              Go to Scanner
              <span>&rarr;</span>
            </Link>
          </div>
        )}

        {/* Portfolio allocation + Aurora score (only if positions exist) */}
        {positions.length > 0 && (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1.05fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[2rem] font-semibold text-white">
                      Portfolio allocation
                    </h2>
                    <p className="mt-2 text-slate-400">
                      {isDemo
                        ? "Top weighted holdings in your demo account."
                        : "Top weighted holdings in your live account."}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm uppercase tracking-[0.20em] text-slate-400">
                    {positions.length} holdings
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {topHoldings.map((row, index) => {
                    const ticker = getTicker(row);
                    const company = getCompany(row);
                    const value = getValue(row);
                    const weight = totals.totalValue ? (value / totals.totalValue) * 100 : 0;

                    return (
                      <div key={`${ticker}-${index}`}>
                        <div className="flex items-end justify-between gap-4">
                          <div className="min-w-0">
                            <Link href={`/dashboard/stocks/${ticker}`} className="text-[1.1rem] font-semibold text-cyan-400 hover:underline cursor-pointer">{ticker}</Link>
                            <div className="truncate text-slate-300">{company}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-[1.1rem] font-semibold text-white">
                              {moneyUSD(value)}
                            </div>
                            <div className="text-sm text-slate-400">
                              {weight.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full ${
                              isDemo
                                ? "bg-[linear-gradient(90deg,#f59e0b,#d97706,#b45309)]"
                                : "bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6)]"
                            }`}
                            style={{ width: `${Math.max(weight, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[2rem] font-semibold text-white">Aurora score</h2>
                    <div className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                      isDemo
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                        : "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
                    }`}>
                      {auroraScore}/99
                    </div>
                  </div>

                  <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${
                        isDemo
                          ? "bg-[linear-gradient(90deg,#f59e0b,#d97706,#92400e)]"
                          : "bg-[linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)]"
                      }`}
                      style={{ width: `${Math.min(Math.max(auroraScore, 4), 99)}%` }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniMetric label="Winners" value={String(winners)} positive />
                    <MiniMetric label="Losers" value={String(losers)} negative />
                    <MiniMetric label="Conviction" value={conviction} amber={isDemo} cyan={!isDemo} />
                  </div>

                  <p className="mt-5 text-base leading-8 text-slate-400">
                    Aurora Score blends position size, return strength and portfolio quality into a quick confidence view.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PerformerCard
                    title="Best performer"
                    row={bestPerformer}
                    getTicker={getTicker}
                    getCompany={getCompany}
                    getPnL={getPnL}
                    getReturn={getReturn}
                    positive
                    isDemo={isDemo}
                  />
                  <PerformerCard
                    title="Weakest performer"
                    row={worstPerformer}
                    getTicker={getTicker}
                    getCompany={getCompany}
                    getPnL={getPnL}
                    getReturn={getReturn}
                    isDemo={isDemo}
                  />
                </div>
              </div>
            </div>

            {/* Positions table */}
            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#07162f]/95">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <h2 className="text-[1.85rem] font-semibold text-white">
                    {isDemo ? "Demo positions" : "Your investments in Trading 212"}
                  </h2>
                  <p className="mt-1 text-slate-300">
                    {isDemo
                      ? "Practice positions with Aurora ranking and performance overlay."
                      : "Live positions with Aurora ranking and performance overlay."}
                  </p>
                </div>

                <div className={`rounded-full border px-4 py-2 text-sm uppercase tracking-[0.22em] ${
                  isDemo
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                    : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                }`}>
                  {isDemo ? "Trading 212 demo" : "Trading 212 live"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/[0.03]">
                    <tr className="border-b border-white/10">
                      <SortHeader label="Ticker" column="ticker" />
                      <SortHeader label="Company" column="company" />
                      <SortHeader label="Qty" column="qty" align="right" />
                      <SortHeader label="Avg Price" column="avgPrice" align="right" />
                      <SortHeader label="Current" column="current" align="right" />
                      <SortHeader label="Cost" column="cost" align="right" />
                      <SortHeader label="Value" column="value" align="right" />
                      <SortHeader label="P/L" column="pnl" align="right" />
                      <SortHeader label="Return" column="return" align="right" />
                      <SortHeader label="Aurora" column="aurora" align="center" />
                    </tr>
                  </thead>

                  <tbody>
                    {sortedPositions.map((row, index) => {
                      const ticker = getTicker(row);
                      const company = getCompany(row);
                      const quantity = getQty(row);
                      const avgPrice = getAvgPrice(row);
                      const current = getCurrent(row);
                      const cost = getCost(row);
                      const value = getValue(row);
                      const pnl = getPnL(row);

                      const fallbackReturn =
                        cost > 0 ? (pnl / cost) * 100 : 0;

                      const ret = getReturn(row) || fallbackReturn;
                      const aurora = getAurora(row);
                      const currency = getCurrency(row);

                      return (
                        <tr
                          key={`${ticker}-${index}`}
                          className={`border-b border-white/5 transition ${
                            isDemo ? "hover:bg-amber-400/[0.04]" : "hover:bg-cyan-400/[0.04]"
                          }`}
                        >
                          <td className={`px-5 py-5 text-[1.05rem] font-semibold ${accentText}`}>
                            <Link href={`/dashboard/stocks/${ticker}`} className="hover:underline cursor-pointer">
                              {ticker}
                            </Link>
                          </td>

                          <td className="px-5 py-5 text-[1rem] text-slate-200">
                            {company}
                          </td>

                          <td className="px-5 py-5 text-right text-[1rem] text-slate-200">
                            {qtyFormat(quantity)}
                          </td>

                          <td className="px-5 py-5 text-right text-[1rem] text-slate-200">
                            <div>{toNumber(avgPrice).toFixed(2)}</div>
                            <div className="text-xs text-slate-400">{currency}</div>
                          </td>

                          <td className="px-5 py-5 text-right text-[1rem] text-slate-200">
                            <div>{toNumber(current).toFixed(2)}</div>
                            <div className="text-xs text-slate-400">{currency}</div>
                          </td>

                          <td className="px-5 py-5 text-right text-[1rem] text-slate-200">
                            {moneyUSD(cost)}
                          </td>

                          <td className="px-5 py-5 text-right text-[1rem] text-slate-200">
                            {moneyUSD(value)}
                          </td>

                          <td
                            className={`px-5 py-5 text-right text-[1rem] font-semibold ${
                              isDemo
                                ? pnl >= 0 ? "text-amber-300" : "text-rose-400"
                                : pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {pnl >= 0 ? "+" : ""}
                            {moneyUSD(pnl)}
                          </td>

                          <td
                            className={`px-5 py-5 text-right text-[1rem] font-semibold ${
                              isDemo
                                ? ret >= 0 ? "text-amber-300" : "text-rose-400"
                                : ret >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {pct(ret)}
                          </td>

                          <td className="px-5 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="h-2.5 w-[80px] overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className={`h-full rounded-full ${
                                    isDemo
                                      ? "bg-[linear-gradient(90deg,#f59e0b,#d97706)]"
                                      : "bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)]"
                                  }`}
                                  style={{ width: `${Math.min(Math.max(aurora, 8), 99)}%` }}
                                />
                              </div>
                              <span className={accentText}>{aurora.toFixed(0)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!sortedPositions.length && !data.loading ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-16 text-center text-slate-400">
                          {isDemo ? "No demo positions found." : "No portfolio positions found."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Demo Orders section */}
        {isDemo && (
          <div className="mt-6 overflow-hidden rounded-[28px] border border-amber-400/15 bg-[#07162f]/95">
            <div className="flex items-center justify-between border-b border-amber-400/10 px-6 py-5">
              <div>
                <h2 className="text-[1.85rem] font-semibold text-white">Demo Orders</h2>
                <p className="mt-1 text-slate-400">Orders placed on your demo account.</p>
              </div>
              <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm uppercase tracking-[0.22em] text-amber-200">
                Demo orders
              </div>
            </div>

            <div className="overflow-x-auto">
              {ordersLoading ? (
                <div className="px-6 py-12 text-center text-slate-400">Loading orders...</div>
              ) : demoOrders.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  No demo orders placed yet. Use the calculator to create practice orders.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-white/[0.03]">
                    <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/80">
                      <th className="px-5 py-4">Ticker</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4 text-right">Qty</th>
                      <th className="px-5 py-4 text-right">Limit Price</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Step</th>
                      <th className="px-5 py-4">Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 transition hover:bg-amber-400/[0.04]">
                        <td className="px-5 py-4 font-semibold text-amber-300"><Link href={`/dashboard/stocks/${order.ticker}`} className="hover:underline cursor-pointer">{order.ticker}</Link></td>
                        <td className="px-5 py-4 text-sm text-slate-300">{order.order_mode}</td>
                        <td className="px-5 py-4 text-right text-sm text-slate-200">{order.quantity}</td>
                        <td className="px-5 py-4 text-right text-sm text-slate-200">{moneyUSD(order.limit_price)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            order.status === "placed"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : order.status === "rejected"
                              ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                              : "border-white/15 bg-white/5 text-white/60"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {order.ladder_step ? `Step ${order.ladder_step}` : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {order.placed_at
                            ? new Date(order.placed_at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  positive,
  isDemo = false,
}: {
  label: string;
  value: string;
  sublabel: string;
  positive?: boolean;
  isDemo?: boolean;
}) {
  return (
    <div className={`rounded-[28px] border px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] ${
      isDemo ? "border-amber-400/10 bg-amber-400/[0.03]" : "border-white/10 bg-white/[0.03]"
    }`}>
      <div className="text-[1rem] text-slate-400">{label}</div>
      <div
        className={`mt-3 text-3xl font-semibold tracking-tight ${
          positive === undefined
            ? "text-white"
            : isDemo
            ? positive
              ? "text-amber-300"
              : "text-rose-400"
            : positive
            ? "text-emerald-400"
            : "text-rose-400"
        }`}
      >
        {value}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.28em] text-slate-500">
        {sublabel}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  positive,
  negative,
  cyan,
  amber,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  cyan?: boolean;
  amber?: boolean;
}) {
  const color = positive
    ? "text-emerald-400"
    : negative
    ? "text-rose-300"
    : amber
    ? "text-amber-300"
    : cyan
    ? "text-cyan-300"
    : "text-white";

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function PerformerCard({
  title,
  row,
  getTicker,
  getCompany,
  getPnL,
  getReturn,
  positive = false,
  isDemo = false,
}: {
  title: string;
  row: Position | null;
  getTicker: (row: Position) => string;
  getCompany: (row: Position) => string;
  getPnL: (row: Position) => number;
  getReturn: (row: Position) => number;
  positive?: boolean;
  isDemo?: boolean;
}) {
  const pnl = row ? getPnL(row) : 0;
  const fallbackReturn = 0;
  const ret = row ? getReturn(row) || fallbackReturn : 0;

  const tone = isDemo
    ? positive
      ? "border-amber-400/20 bg-amber-400/[0.04]"
      : "border-rose-400/20 bg-rose-400/[0.04]"
    : positive
    ? "border-emerald-400/20 bg-emerald-400/[0.04]"
    : "border-rose-400/20 bg-rose-400/[0.04]";

  const valueTone = isDemo
    ? positive ? "text-amber-300" : "text-rose-300"
    : positive ? "text-emerald-400" : "text-rose-300";

  const barColor = isDemo
    ? positive ? "bg-amber-300/70" : "bg-rose-300/70"
    : positive ? "bg-emerald-300/70" : "bg-rose-300/70";

  return (
    <div className={`rounded-[28px] border p-6 ${tone}`}>
      <div className="text-base text-slate-400">{title}</div>

      <div className="mt-3 truncate text-[1.2rem] font-semibold leading-tight text-white">
        {row ? getTicker(row) : "--"}
      </div>

      <div className="mt-2 line-clamp-2 min-h-[56px] text-lg text-slate-300">
        {row ? getCompany(row) : "No data"}
      </div>

      <div className={`mt-6 text-[2.2rem] font-semibold leading-none ${valueTone}`}>
        {pnl >= 0 ? "+" : ""}
        {moneyUSD(pnl)}
      </div>

      <div className={`mt-3 text-xl ${valueTone}`}>{pct(ret)}</div>

      <div className="mt-8 flex items-end gap-2">
        {[18, 20, 14, 6, 20].map((h, i) => (
          <div
            key={i}
            className={`w-8 rounded-t-md ${barColor}`}
            style={{ height: `${h * 1.4}px` }}
          />
        ))}
      </div>
    </div>
  );
}
