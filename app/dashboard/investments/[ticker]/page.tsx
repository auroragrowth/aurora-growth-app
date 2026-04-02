import Link from "next/link";
import { notFound } from "next/navigation";

type Trading212Position = {
  instrument?: {
    ticker?: string;
    name?: string;
    currency?: string;
    isin?: string;
  };
  quantity?: number;
  currentPrice?: number;
  averagePricePaid?: number;
  walletImpact?: {
    currency?: string;
    totalCost?: number;
    currentValue?: number;
    unrealizedProfitLoss?: number;
    fxImpact?: number | null;
  };
  createdAt?: string;
};

type RouteResponse = {
  ok?: boolean;
  positions?: Trading212Position[];
  error?: string;
};

function num(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function pct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function cleanTicker(ticker?: string) {
  return ticker?.replace("_US_EQ", "").replace("_EQ", "") || "—";
}

function auroraScore(position: Trading212Position) {
  const pnl = num(position.walletImpact?.unrealizedProfitLoss);
  const cost = num(position.walletImpact?.totalCost);
  const value = num(position.walletImpact?.currentValue);
  const ret = cost > 0 ? (pnl / cost) * 100 : 0;

  const sizeScore = Math.min(value / 8, 38);
  const returnScore = Math.max(0, Math.min((ret + 10) * 2.8, 36));
  const profitBias = pnl > 0 ? 18 : pnl < 0 ? 7 : 11;

  return Math.round(Math.max(1, Math.min(99, sizeScore + returnScore + profitBias)));
}

function momentumLabel(ret: number) {
  if (ret >= 12) return "Breakout strength";
  if (ret >= 6) return "Strong momentum";
  if (ret >= 2) return "Positive trend";
  if (ret >= -2) return "Neutral";
  if (ret >= -6) return "Soft pullback";
  return "Weak momentum";
}

function convictionLabel(score: number) {
  if (score >= 80) return "High conviction";
  if (score >= 60) return "Constructive";
  if (score >= 40) return "Balanced";
  return "Watch closely";
}

function sparkBars(seed: string) {
  return seed.split("").slice(0, 18).map((c, i) => {
    const code = c.charCodeAt(0);
    return ((code * (i + 5)) % 65) + 22;
  });
}

function tradingViewSymbol(rawTicker: string) {
  const t = rawTicker.toUpperCase();

  if (t === "VUAGI" || t === "VUAGL" || t === "VUAG") return "LSE:VUAG";
  if (t === "MSFT") return "NASDAQ:MSFT";
  if (t === "SPOT") return "NYSE:SPOT";
  if (t === "TOST") return "NYSE:TOST";
  if (t === "NBIX") return "NASDAQ:NBIX";

  return `NASDAQ:${t}`;
}

function inferSectorAndStyle(ticker: string, companyName: string) {
  const t = ticker.toUpperCase();
  const name = companyName.toLowerCase();

  if (t === "MSFT" || name.includes("microsoft")) {
    return { sector: "Technology", style: "Mega-cap compounder", momentumBias: 1.15 };
  }
  if (t === "SPOT" || name.includes("spotify")) {
    return { sector: "Communication Services", style: "Platform growth", momentumBias: 1.22 };
  }
  if (t === "TOST" || name.includes("toast")) {
    return { sector: "Technology", style: "High-growth software", momentumBias: 1.28 };
  }
  if (t === "NBIX" || name.includes("neurocrine")) {
    return { sector: "Healthcare", style: "Biotech growth", momentumBias: 1.18 };
  }
  if (t === "VUAG" || t === "VUAGL" || t === "VUAGI") {
    return { sector: "ETF", style: "Index core holding", momentumBias: 0.9 };
  }

  return { sector: "Growth Equity", style: "Aurora tracked holding", momentumBias: 1.0 };
}

function roundPrice(value: number) {
  if (value >= 500) return Number(value.toFixed(2));
  if (value >= 100) return Number(value.toFixed(2));
  if (value >= 10) return Number(value.toFixed(2));
  return Number(value.toFixed(3));
}

function buildAuroraLadder(params: {
  averagePricePaid: number;
  currentPrice: number;
  quantity: number;
  cost: number;
  value: number;
  score: number;
  momentumBias: number;
}) {
  const { averagePricePaid, currentPrice, quantity, cost, value, score, momentumBias } = params;

  const base = averagePricePaid > 0 ? averagePricePaid : currentPrice;
  const pnlPct = base > 0 ? ((currentPrice - base) / base) * 100 : 0;

  const volatilityBase =
    score >= 80 ? 0.038 :
    score >= 65 ? 0.045 :
    score >= 50 ? 0.055 :
    0.065;

  const momentumTightener =
    pnlPct >= 8 ? 0.92 :
    pnlPct >= 3 ? 0.97 :
    pnlPct >= -2 ? 1.0 :
    1.08;

  const positionSizeBias =
    value >= 400 ? 0.96 :
    value >= 200 ? 1.0 :
    1.05;

  const step = volatilityBase * momentumTightener * positionSizeBias * momentumBias;

  const breakEven = base;
  const add1 = base * (1 - step);
  const add2 = base * (1 - step * 1.85);
  const add3 = base * (1 - step * 2.65);

  const target1 = base * (1 + step * 1.45);
  const target2 = base * (1 + step * 2.35);
  const target3 = base * (1 + step * 3.6);

  const riskLine = base * (1 - step * 3.2);
  const trailingGuard = currentPrice * (1 - step * 1.35);

  const capitalPerShare = quantity > 0 ? cost / quantity : base;
  const rebalanceSize1 = capitalPerShare > 0 ? Math.max(0.1, Math.min(quantity * 0.35, cost * 0.18 / capitalPerShare)) : 0;
  const rebalanceSize2 = capitalPerShare > 0 ? Math.max(0.1, Math.min(quantity * 0.25, cost * 0.12 / capitalPerShare)) : 0;

  let status: string;
  if (currentPrice >= target2) status = "Extended above target zone";
  else if (currentPrice >= target1) status = "In first profit zone";
  else if (currentPrice >= breakEven) status = "Above break-even";
  else if (currentPrice >= add1) status = "Inside active range";
  else if (currentPrice >= add2) status = "In add zone";
  else status = "Below planned ladder";

  return {
    stepPct: step * 100,
    pnlPct,
    breakEven: roundPrice(breakEven),
    add1: roundPrice(add1),
    add2: roundPrice(add2),
    add3: roundPrice(add3),
    target1: roundPrice(target1),
    target2: roundPrice(target2),
    target3: roundPrice(target3),
    riskLine: roundPrice(riskLine),
    trailingGuard: roundPrice(trailingGuard),
    rebalanceSize1: Number(rebalanceSize1.toFixed(3)),
    rebalanceSize2: Number(rebalanceSize2.toFixed(3)),
    status,
  };
}

async function getPosition(ticker: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3001";

  const res = await fetch(`${baseUrl}/api/trading212/positions`, {
    cache: "no-store",
  });

  const json = (await res.json()) as RouteResponse;

  if (!res.ok || !json?.ok || !Array.isArray(json.positions)) {
    return null;
  }

  const normalTicker = decodeURIComponent(ticker).toUpperCase();

  return (
    json.positions.find((p) => cleanTicker(p.instrument?.ticker).toUpperCase() === normalTicker) ||
    null
  );
}

export default async function InvestmentTickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const position = await getPosition(ticker);

  if (!position) {
    notFound();
  }

  const displayTicker = cleanTicker(position.instrument?.ticker);
  const companyName = position.instrument?.name || displayTicker;
  const quantity = num(position.quantity);
  const currentPrice = num(position.currentPrice);
  const averagePricePaid = num(position.averagePricePaid);
  const cost = num(position.walletImpact?.totalCost);
  const value = num(position.walletImpact?.currentValue);
  const pnl = num(position.walletImpact?.unrealizedProfitLoss);
  const fxImpact = num(position.walletImpact?.fxImpact);
  const ret = cost > 0 ? (pnl / cost) * 100 : 0;
  const score = auroraScore(position);
  const momentum = momentumLabel(ret);
  const conviction = convictionLabel(score);
  const bars = sparkBars(displayTicker);
  const currency = position.instrument?.currency || "";
  const entryGap = averagePricePaid > 0 ? ((currentPrice - averagePricePaid) / averagePricePaid) * 100 : 0;
  const createdAt = position.createdAt
    ? new Date(position.createdAt).toLocaleString("en-GB")
    : "—";

  const meta = inferSectorAndStyle(displayTicker, companyName);
  const ladder = buildAuroraLadder({
    averagePricePaid,
    currentPrice,
    quantity,
    cost,
    value,
    score,
    momentumBias: meta.momentumBias,
  });

  const tvSymbol = tradingViewSymbol(displayTicker);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_75%_18%,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#071226_42%,#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3">
              <Link
                href="/dashboard/investments"
                className="text-sm text-cyan-300 transition hover:text-cyan-200 hover:underline"
              >
                ← Back to investments
              </Link>
            </div>
            <h1 className="text-5xl font-semibold tracking-tight">{displayTicker}</h1>
            <p className="mt-3 text-lg text-slate-300">{companyName}</p>
            <p className="mt-1 text-sm text-slate-500">
              Trading 212 holding detail with Aurora overlay
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              Aurora Score {score}/99
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {conviction}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {meta.sector}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl">
            <div className="text-sm text-slate-400">Current value</div>
            <div className="mt-3 text-4xl font-semibold">{usd(value)}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Live holding value
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl">
            <div className="text-sm text-slate-400">Invested</div>
            <div className="mt-3 text-4xl font-semibold">{usd(cost)}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Cost basis
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(16,185,129,0.1)] backdrop-blur-xl">
            <div className="text-sm text-slate-400">Profit / loss</div>
            <div className={`mt-3 text-4xl font-semibold ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {pnl >= 0 ? "+" : ""}
              {usd(pnl)}
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Open performance
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.03))] p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
            <div className="text-sm text-slate-400">Return</div>
            <div className={`mt-3 text-4xl font-semibold ${ret >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {pct(ret)}
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Position efficiency
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Position detail</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Core investment metrics for this live holding.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                Live position
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ticker</div>
                <div className="mt-2 text-2xl font-semibold text-cyan-300">{displayTicker}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Company</div>
                <div className="mt-2 text-xl font-semibold text-white">{companyName}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Quantity</div>
                <div className="mt-2 text-2xl font-semibold text-white">{quantity.toFixed(3)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Currency</div>
                <div className="mt-2 text-2xl font-semibold text-white">{currency || "—"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Average entry</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {averagePricePaid.toFixed(2)} {currency}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current price</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {currentPrice.toFixed(2)} {currency}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Entry gap</div>
                <div className={`mt-2 text-2xl font-semibold ${entryGap >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {pct(entryGap)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">FX impact</div>
                <div className={`mt-2 text-2xl font-semibold ${fxImpact >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {fxImpact === 0 ? "$0.00" : `${fxImpact >= 0 ? "+" : ""}${usd(fxImpact)}`}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Position timeline</div>
                  <div className="mt-2 text-lg font-semibold text-white">Opened</div>
                </div>
                <div className="text-right text-slate-300">{createdAt}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Aurora score</h2>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                  {score}/99
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#3b82f6_50%,#8b5cf6_100%)]"
                  style={{ width: `${score}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Momentum</div>
                  <div className="mt-2 text-xl font-semibold text-cyan-300">{momentum}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Conviction</div>
                  <div className="mt-2 text-xl font-semibold text-white">{conviction}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Sector / view</div>
                  <div className="mt-2 text-xl font-semibold text-white">{meta.style}</div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-400">
                Aurora Score blends position size, live return behaviour and strength bias
                into a fast-read confidence metric for the holding.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(16,185,129,0.06)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Momentum view</h2>
                <div className={`rounded-full px-3 py-1 text-sm ${ret >= 0 ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border border-rose-400/20 bg-rose-400/10 text-rose-200"}`}>
                  {pct(ret)}
                </div>
              </div>

              <div className="flex h-44 items-end gap-2 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                {bars.map((bar, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-t ${ret >= 0 ? "bg-emerald-300/70" : "bg-rose-300/70"}`}
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Trend</div>
                  <div className="mt-2 font-semibold text-white">{momentum}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Bias</div>
                  <div className="mt-2 font-semibold text-white">
                    {ret >= 0 ? "Constructive" : "Defensive"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Focus</div>
                  <div className="mt-2 font-semibold text-white">Position manage</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_0_60px_rgba(59,130,246,0.06)] backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Chart and ladder zone</h2>
              <p className="mt-1 text-sm text-slate-400">
                Dynamic Aurora ladder using score, return strength and holding behaviour.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
              Smart ladder
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold text-white">{displayTicker} live chart</div>
                <div className="text-sm text-slate-500">{tvSymbol}</div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <iframe
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${displayTicker}&symbol=${encodeURIComponent(
                    tvSymbol
                  )}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=0f172a&theme=dark&style=1&timezone=Europe%2FLondon&withdateranges=1&hideideas=1&studies=[]&enabled_features=[]&disabled_features=[]&locale=en&utm_source=auroragrowth.co.uk&utm_medium=widget&utm_campaign=chart`}
                  title={`${displayTicker} chart`}
                  className="h-[420px] w-full"
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ladder step</div>
                  <div className="mt-2 text-xl font-semibold text-cyan-300">
                    {ladder.stepPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {ladder.status}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Sector</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {meta.sector}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Style</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {meta.style}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Aurora ladder view</h3>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  Adaptive
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Break-even</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.breakEven.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-200">Target 1</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.target1.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-200">Target 2</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.target2.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-200">Target 3</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.target3.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Add zone 1</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.add1.toFixed(2)} {currency}
                  </div>
                  <div className="mt-1 text-xs text-amber-100">
                    Suggested add size: {ladder.rebalanceSize1.toFixed(3)} shares
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Add zone 2</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.add2.toFixed(2)} {currency}
                  </div>
                  <div className="mt-1 text-xs text-amber-100">
                    Suggested add size: {ladder.rebalanceSize2.toFixed(3)} shares
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Deep add zone</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.add3.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-rose-200">Risk line</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.riskLine.toFixed(2)} {currency}
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-400/20 bg-purple-400/10 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-purple-200">Trailing guard</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ladder.trailingGuard.toFixed(2)} {currency}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current position read</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-slate-400">Current</div>
                    <div className="mt-1 font-semibold text-white">
                      {currentPrice.toFixed(2)} {currency}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-slate-400">Average</div>
                    <div className="mt-1 font-semibold text-white">
                      {averagePricePaid.toFixed(2)} {currency}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-slate-400">Open return</div>
                    <div className={`mt-1 font-semibold ${ret >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {pct(ret)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-slate-400">Ladder status</div>
                    <div className="mt-1 font-semibold text-white">
                      {ladder.status}
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-400">
                This upgraded ladder adapts to the holding using Aurora score, momentum strength,
                position size and current open return to tighten or widen buy and profit zones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
