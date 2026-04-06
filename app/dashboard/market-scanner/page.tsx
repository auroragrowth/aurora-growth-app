"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";
import { ExpiredBlur } from "@/components/dashboard/ExpiredOverlay";
import MarketCountdown from "@/components/dashboard/MarketCountdown";
import TickerTape from "@/components/tradingview/TickerTape";

type ScannerRow = {
  id?: string;
  ticker?: string | null;
  symbol?: string | null;
  company_name?: string | null;
  company?: string | null;
  sector?: string | null;
  market_cap?: string | number | null;
  price?: string | number | null;
  change_percent?: string | number | null;
  aurora_score?: string | number | null;
  score?: string | number | null;
  trend?: string | null;
  scanner_type?: string | null;
  scanner_run_at?: string | null;
  updated_at?: string | null;
  rises_count_18m?: number | null;
  most_recent_hat_price?: number | null;
  most_recent_hat_date?: string | null;
  drop_from_hat_pct?: number | null;
  readiness?: string | null;
};

type TabFilter = "all" | "core" | "alternative" | "search";
type SortKey =
  | "ticker"
  | "company_name"
  | "market_cap"
  | "price"
  | "change_percent"
  | "score"
  | "readiness";

function toTicker(row: ScannerRow) {
  return String(row.ticker || row.symbol || "").toUpperCase();
}

function toCompany(row: ScannerRow) {
  return String(row.company_name || row.company || "");
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%,$£,\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(value: unknown) {
  const str = String(value || "").trim();

  // Handle Finviz-style strings like "26.3B", "450.2M", "1.5T"
  const suffixMatch = str.match(/^([\d,.]+)\s*([BMT])$/i);
  if (suffixMatch) {
    return `$${suffixMatch[1]}${suffixMatch[2].toUpperCase()}`;
  }

  // If value is a percentage string, it's bad data — show dash
  if (str.includes("%")) return "—";

  const n = toNumber(value);
  if (!n) return "—";
  if (Math.abs(n) >= 1_000_000_000_000)
    return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(n) >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPrice(value: unknown) {
  const n = toNumber(value);
  if (!n) return "—";
  return `$${n.toFixed(2)}`;
}

function formatPercent(value: unknown) {
  const n = toNumber(value);
  if (!n) return "0.00%";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getScore(row: ScannerRow) {
  return toNumber(row.aurora_score ?? row.score);
}

function getMomentum(score: number) {
  if (score >= 30)
    return {
      label: "STRONG",
      cls: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
    };
  if (score >= 22)
    return {
      label: "BUILDING",
      cls: "border-teal-400/30 bg-teal-400/15 text-teal-300",
    };
  if (score >= 15)
    return {
      label: "WATCH",
      cls: "border-amber-400/30 bg-amber-400/15 text-amber-300",
    };
  return {
    label: "WEAK",
    cls: "border-white/15 bg-white/5 text-white/45",
  };
}

function getReadiness(row: ScannerRow) {
  const rises = row.rises_count_18m || 0;
  const drop = parseFloat(String(row.drop_from_hat_pct || "0"));
  const r = row.readiness || "grey";

  if (rises < 3 || r === "grey")
    return {
      bg: "bg-white/5 border-white/10",
      dot: "bg-white/20",
      text: "text-white/30",
      label: rises > 0 ? `${rises} rise${rises === 1 ? "" : "s"}` : "—",
      tooltip:
        rises > 0
          ? `Only ${rises} qualifying rise${rises === 1 ? "" : "s"} in 12 months — needs 3+`
          : "No Aurora peak data yet",
      priority: 4,
    };
  if (r === "green" || drop >= 20)
    return {
      bg: "bg-green-500/15 border-green-500/30",
      dot: "bg-green-400",
      text: "text-green-400",
      label: `${drop.toFixed(1)}% ↓`,
      tooltip: `READY — ${drop.toFixed(1)}% below last peak. ${rises} rises of 20%+ in 12m.`,
      priority: 1,
    };
  if (r === "amber" || (drop >= 10 && drop < 20))
    return {
      bg: "bg-amber-500/15 border-amber-500/30",
      dot: "bg-amber-400",
      text: "text-amber-400",
      label: `${drop.toFixed(1)}% ↓`,
      tooltip: `APPROACHING — ${drop.toFixed(1)}% below last peak. Needs 20%+. ${rises} rises in 12m.`,
      priority: 2,
    };
  return {
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-400",
    text: "text-red-400",
    label: drop < 0 ? "Above peak" : `${drop.toFixed(1)}% ↓`,
    tooltip: `NOT READY — Only ${drop.toFixed(1)}% from peak. ${rises} rises in 12m.`,
    priority: 3,
  };
}

function buildSparklinePath(
  price: number,
  change: number,
  width: number,
  height: number,
  points: number
): string {
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / (points - 1);

  const mag = Math.min(Math.abs(change), 12);
  const trend = change > 0.05 ? 1 : change < -0.05 ? -1 : 0;

  const seed = Math.abs(Math.round(price * 100)) % 1000;

  const vals: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trendComponent = trend * t * mag * 0.06;
    const hash = Math.sin(seed * 0.1 + i * 1.7) * 0.5 + 0.5;
    const noise = (hash - 0.5) * 0.25;
    vals.push(0.5 - trendComponent + noise);
  }

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const coords = vals.map((v, i) => ({
    x: pad + i * step,
    y: pad + ((v - min) / range) * h,
  }));

  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }

  return d;
}

let sparklineStyleInjected = false;

function Sparkline({ price, change }: { price: number; change: number }) {
  const w = 64;
  const h = 28;
  const pts = 20;

  const color =
    change > 0.05 ? "#22d3ee" : change < -0.05 ? "#f87171" : "#6b7280";

  const d = buildSparklinePath(price, change, w, h, pts);

  useEffect(() => {
    if (sparklineStyleInjected) return;
    sparklineStyleInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes sparkDraw {
        from { stroke-dashoffset: var(--spark-len); }
        to   { stroke-dashoffset: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const pathLen = pts * 10;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className="inline-block"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={
          {
            "--spark-len": pathLen,
            strokeDasharray: pathLen,
            strokeDashoffset: 0,
            animation: "sparkDraw 1s ease-out forwards",
          } as React.CSSProperties
        }
      />
    </svg>
  );
}

function getWatchlistSource(
  row: ScannerRow,
  activeTab: TabFilter
): string {
  if (activeTab === "search") return "My List";
  const st = String(row.scanner_type || "").toLowerCase();
  if (st === "core") return "Aurora Core";
  if (st === "alternative") return "Aurora Alternative";
  return "My List";
}

/* ── Readiness Hover Popout ─────────────────────────── */

function ReadinessPopout({ row, r }: { row: ScannerRow; r: ReturnType<typeof getReadiness> }) {
  const rises = row.rises_count_18m || 0;
  const drop = parseFloat(String(row.drop_from_hat_pct || "0"));
  const peakPrice = parseFloat(String(row.most_recent_hat_price || "0"));
  const price = toNumber(row.price);
  const ticker = toTicker(row);
  const readiness = row.readiness || "grey";

  return (
    <div
      className="w-72 rounded-2xl border border-white/12 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
      style={{ background: "#080f1e" }}
    >
      <div className={`px-4 py-3 border-b border-white/10 flex items-center gap-3 ${r.bg}`}>
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${r.dot}`} />
        <div>
          <p className={`text-sm font-bold ${r.text}`}>
            {readiness === "green" ? "READY TO WATCH" : readiness === "amber" ? "APPROACHING" : readiness === "red" ? "NOT YET READY" : "INSUFFICIENT DATA"}
          </p>
          <p className="text-white/40 text-xs">Aurora Readiness — {ticker}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-white/30 text-xs uppercase tracking-wider font-bold mb-1.5">What this means</p>
          <p className="text-white/70 text-sm leading-relaxed">
            {readiness === "green"
              ? `${ticker} has dropped ${drop.toFixed(1)}% from its most recent Aurora peak and has shown ${rises} qualifying rises of 20%+ in the last 12 months. This stock may be approaching an Aurora entry window.`
              : readiness === "amber"
                ? `${ticker} is getting closer — it is ${drop.toFixed(1)}% below its last peak. It needs to reach 20% before it enters the Aurora buy zone. Worth monitoring closely.`
                : readiness === "red"
                  ? `${ticker} has only dropped ${drop.toFixed(1)}% from its recent peak. The Aurora method begins at 20% below the peak. This stock is not yet in range.`
                  : `${ticker} does not yet have enough Aurora peak data. A qualifying stock needs at least 3 rises of 20%+ in the last 12 months. Currently shows ${rises} qualifying rise${rises === 1 ? "" : "s"}.`}
          </p>
        </div>

        {peakPrice > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Most recent peak", value: `$${peakPrice.toFixed(2)}`, color: "text-white" },
              { label: "Current price", value: price > 0 ? `$${price.toFixed(2)}` : "—", color: "text-white" },
              { label: "Drop from peak", value: drop > 0 ? `${drop.toFixed(1)}%` : `+${Math.abs(drop).toFixed(1)}%`, color: drop >= 20 ? "text-green-400" : drop >= 10 ? "text-amber-400" : "text-red-400" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                <p className="text-white/30 text-xs mb-1 leading-tight">{item.label}</p>
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-bold">Rise history (12 months)</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rises >= 3 ? "bg-green-500/20 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {rises}/3 needed
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex-1 h-2 rounded-full ${n <= rises ? "bg-gradient-to-r from-cyan-400 to-purple-400" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-white/30 text-xs mt-1.5">
            {rises >= 3 ? `✓ Qualifies — ${rises} rise${rises === 1 ? "" : "s"} of 20%+ detected` : `${rises} of 3 required rises of 20%+ detected`}
          </p>
        </div>

        {peakPrice > 0 && readiness !== "green" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-white/30 text-xs uppercase tracking-wider font-bold">Progress to Aurora entry</p>
              <p className="text-white/40 text-xs">{drop >= 0 ? `${drop.toFixed(1)}% of 20%` : "Above peak"}</p>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${drop >= 20 ? "bg-green-400" : drop >= 10 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(Math.max((drop / 20) * 100, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-white/20 text-xs">0%</p>
              <p className="text-green-400/60 text-xs">20% = Ready</p>
            </div>
          </div>
        )}

        <p className="text-white/20 text-xs pt-1 border-t border-white/5">
          Aurora readiness is based on drop from the most recent qualifying peak and rise frequency — not a buy signal.
        </p>
      </div>
    </div>
  );
}

/* ── Ticker Hover Popup ─────────────────────────────── */

function TickerPopup({
  row,
  anchorRect,
  onWatchlistToggle,
  isOnWatchlist,
  onMouseEnter,
  onMouseLeave,
}: {
  row: ScannerRow;
  anchorRect: DOMRect;
  onWatchlistToggle: () => void;
  isOnWatchlist: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const ticker = toTicker(row);
  const company = toCompany(row);
  const score = getScore(row);
  const change = toNumber(row.change_percent);
  const momentum = getMomentum(score);

  const popupW = 380;
  const popupH = 420;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = anchorRect.right + 8;
  let top = anchorRect.top;

  if (left + popupW > vw - 16) {
    left = anchorRect.left - popupW - 8;
  }
  if (left < 8) {
    left = anchorRect.left;
    top = anchorRect.bottom + 8;
  }
  if (top + popupH > vh - 16) {
    top = vh - popupH - 16;
  }
  if (top < 8) top = 8;

  const chartUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_popup&symbol=${encodeURIComponent(ticker)}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_legend=1&save_image=0&hide_volume=1&width=348&height=200`;

  return (
    <div
      className="fixed z-[9999] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#060e1e]/98 shadow-[0_8px_40px_rgba(0,180,255,0.15)] backdrop-blur-xl"
      style={{
        left,
        top,
        width: popupW,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-white">{ticker}</span>
            <span className="ml-2 text-sm text-white/50">{company}</span>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${momentum.cls}`}
          >
            {momentum.label}
          </span>
        </div>
      </div>

      <div className="px-1 pt-1">
        <iframe
          src={chartUrl}
          width="100%"
          height="200"
          frameBorder="0"
          allowTransparency={true}
          className="rounded-lg"
          loading="lazy"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/35">
            Score
          </div>
          <div className="mt-0.5 text-sm font-semibold text-cyan-300">
            {score ? score.toFixed(0) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/35">
            Price
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white/90">
            {formatPrice(row.price)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/35">
            Change
          </div>
          <div
            className={`mt-0.5 text-sm font-semibold ${change >= 0 ? "text-emerald-300" : "text-red-300"}`}
          >
            {formatPercent(row.change_percent)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/35">
            Mkt Cap
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white/80">
            {formatMoney(row.market_cap)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/8 px-4 py-3">
        <Link
          href={`/dashboard/stocks/${ticker}`}
          className="flex-1 rounded-xl border border-cyan-400/25 bg-cyan-400/10 py-2 text-center text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
        >
          Open full chart
        </Link>
        <button
          type="button"
          onClick={onWatchlistToggle}
          className={`flex-1 rounded-xl border py-2 text-center text-xs font-semibold transition ${
            isOnWatchlist
              ? "border-amber-400/25 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
              : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {isOnWatchlist ? "On watchlist" : "Add to watchlist"}
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────── */

export default function MarketScannerPage() {
  const { hasTicker, toggleTicker, ready, items } = useWatchlist();

  const [coreRows, setCoreRows] = useState<ScannerRow[]>([]);
  const [altRows, setAltRows] = useState<ScannerRow[]>([]);
  const [searchRows, setSearchRows] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTabRaw] = useState<TabFilter>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scanner_tab") as TabFilter | null;
      if (saved === "core" || saved === "alternative" || saved === "all") return saved;
    }
    return "all";
  });
  const setActiveTab = (tab: TabFilter) => {
    setActiveTabRaw(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("scanner_tab", tab);
    }
  };
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [hoverRow, setHoverRow] = useState<ScannerRow | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inPopupRef = useRef(false);
  const inTickerRef = useRef(false);

  const [aiOverview, setAiOverview] = useState<string | null>(null);
  const [aiOverviewLoading, setAiOverviewLoading] = useState(false);

  const loadAiOverview = useCallback(async (force = false) => {
    setAiOverviewLoading(true);
    try {
      const res = await fetch(
        `/api/aurora/intelligence?mode=overview${force ? "&force=1" : ""}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.overview) setAiOverview(data.overview);
    } catch {
      /* ignore */
    } finally {
      setAiOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAiOverview();
  }, [loadAiOverview]);

  // Log scanner view for quickstart tracking
  useEffect(() => {
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "scanner_view", event_label: "Viewed market scanner" }),
    }).catch(() => {});
  }, []);

  function clearHover() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function scheduleClose() {
    clearHover();
    hoverTimerRef.current = setTimeout(() => {
      if (!inPopupRef.current && !inTickerRef.current) {
        setHoverRow(null);
        setHoverRect(null);
      }
    }, 150);
  }

  function handleTickerMouseEnter(
    row: ScannerRow,
    e: React.MouseEvent<HTMLElement>
  ) {
    inTickerRef.current = true;
    clearHover();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setHoverRow(row);
      setHoverRect(rect);
    }, 500);
  }

  function handleTickerMouseLeave() {
    inTickerRef.current = false;
    scheduleClose();
  }

  function handlePopupMouseEnter() {
    inPopupRef.current = true;
    clearHover();
  }

  function handlePopupMouseLeave() {
    inPopupRef.current = false;
    scheduleClose();
  }

  const loadLists = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) setRefreshing(true);
      else setLoading(true);

      const [coreRes, altRes] = await Promise.all([
        fetch("/api/aurora-market-scanner?universe=core", {
          cache: "no-store",
        }),
        fetch("/api/aurora-market-scanner?universe=alternative", {
          cache: "no-store",
        }),
      ]);

      const coreData = await coreRes.json().catch(() => null);
      const altData = await altRes.json().catch(() => null);

      const cRows: ScannerRow[] = Array.isArray(coreData?.rows)
        ? coreData.rows
        : [];
      const aRows: ScannerRow[] = Array.isArray(altData?.rows)
        ? altData.rows
        : [];

      setCoreRows(cRows);
      setAltRows(aRows);

      const allRows = [...cRows, ...aRows];
      const newest = allRows
        .map((r) => r.scanner_run_at || r.updated_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];

      setLastUpdated(newest || null);
    } catch (error) {
      console.error("Failed to load scanner:", error);
      setCoreRows([]);
      setAltRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  async function handleFullSearch() {
    const term = query.trim();
    if (!term) return;

    setSearching(true);
    try {
      const res = await fetch(
        `/api/aurora-scanner/search?q=${encodeURIComponent(term)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => null);
      const rows: ScannerRow[] = Array.isArray(data?.rows) ? data.rows : [];
      setSearchRows(rows);
      setActiveTab("search");
    } catch (error) {
      console.error("Search failed:", error);
      setSearchRows([]);
      setActiveTab("search");
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleFullSearch();
    }
  }

  const baseRows = useMemo(() => {
    if (activeTab === "core") return coreRows;
    if (activeTab === "alternative") return altRows;
    if (activeTab === "search") return searchRows;
    // Deduplicate by ticker, preferring core over alternative
    const seen = new Set<string>();
    return [...coreRows, ...altRows].filter((row) => {
      const key = toTicker(row);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activeTab, coreRows, altRows, searchRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result =
      activeTab === "search"
        ? baseRows
        : baseRows.filter((row) => {
            if (!q) return true;
            return (
              toTicker(row).toLowerCase().includes(q) ||
              toCompany(row).toLowerCase().includes(q)
            );
          });

    result = [...result].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortKey) {
        case "ticker":
          aVal = toTicker(a);
          bVal = toTicker(b);
          break;
        case "company_name":
          aVal = toCompany(a);
          bVal = toCompany(b);
          break;
        case "market_cap":
          aVal = toNumber(a.market_cap);
          bVal = toNumber(b.market_cap);
          break;
        case "price":
          aVal = toNumber(a.price);
          bVal = toNumber(b.price);
          break;
        case "change_percent":
          aVal = toNumber(a.change_percent);
          bVal = toNumber(b.change_percent);
          break;
        case "score":
          aVal = getScore(a);
          bVal = getScore(b);
          break;
        case "readiness":
          aVal = getReadiness(a).priority;
          bVal = getReadiness(b).priority;
          break;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [baseRows, query, sortKey, sortDirection, activeTab]);

  async function handleToggleWatchlist(row: ScannerRow) {
    const ticker = toTicker(row);
    if (!ticker) return;

    const company = toCompany(row);
    const source = getWatchlistSource(row, activeTab);

    try {
      const result = await toggleTicker(ticker, company, source);
      if (!result?.ok) {
        throw new Error("Unable to update watchlist");
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Unable to update watchlist"
      );
    }
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(
      nextKey === "ticker" || nextKey === "company_name" ? "asc" : "desc"
    );
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "core", label: "Core" },
    { key: "alternative", label: "Alternative" },
    ...(searchRows.length > 0
      ? [{ key: "search" as TabFilter, label: "Search Results" }]
      : []),
  ];

  const universeLabel =
    activeTab === "all"
      ? "All"
      : activeTab === "core"
        ? "Core"
        : activeTab === "alternative"
          ? "Alternative"
          : "Search";

  const hasWatchlistItems = items && items.length > 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <TickerTape />
      <MarketCountdown />
      {/* Hover popup portal */}
      {hoverRow && hoverRect && (
        <TickerPopup
          row={hoverRow}
          anchorRect={hoverRect}
          onWatchlistToggle={() => handleToggleWatchlist(hoverRow)}
          isOnWatchlist={hasTicker(toTicker(hoverRow))}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}

      <div className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,12,24,.96),rgba(8,16,32,.92))] p-5 shadow-[0_0_45px_rgba(0,180,255,.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Aurora Scanner
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Market Scanner
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Scan Aurora core and alternative ideas, sort by score, and add
              names straight into your watchlist.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Universe
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {universeLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Loaded
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {filteredRows.length} stocks
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Watchlist
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {ready
                  ? hasWatchlistItems
                    ? "Connected"
                    : "Empty"
                  : "Loading"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Updated
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {formatTimestamp(lastUpdated)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row">
          <div className="relative w-full xl:max-w-md">
            <input
              type="text"
              placeholder="Search stocks — to compare use: FNV, MSFT"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-28 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={handleFullSearch}
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-cyan-400/30 bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search all"}
              </button>
            )}
            <div className="mt-1 text-[11px] text-white/30">
              Search to filter results. Press Enter to scan all markets.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map(({ key, label }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => loadLists(true)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <ExpiredBlur>
        <div className="overflow-visible rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,20,.98),rgba(8,14,26,.95))]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <th className="w-12 px-3 py-4 text-center" title="Add to your watchlist">Watch</th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleSort("ticker")}
                      className="hover:text-white"
                    >
                      Ticker
                    </button>
                  </th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleSort("company_name")}
                      className="hover:text-white"
                    >
                      Company
                    </button>
                  </th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleSort("readiness")}
                      className="hover:text-white"
                    >
                      Readiness
                    </button>
                  </th>
                  <th className="px-4 py-4">Last Rise</th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleSort("price")}
                      className="hover:text-white"
                    >
                      Price
                    </button>
                  </th>
                  <th className="px-4 py-4">Chart</th>
                </tr>
              </thead>

              <tbody>
                {loading || searching ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-white/50"
                    >
                      {searching
                        ? "Searching the market..."
                        : "Loading market scanner..."}
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-white/50"
                    >
                      No scanner results found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const ticker = toTicker(row);
                    const company = toCompany(row);
                    const onWatchlist = hasTicker(ticker);
                    const score = getScore(row);
                    const change = toNumber(row.change_percent);
                    const momentum = getMomentum(score);

                    return (
                      <tr
                        key={row.id || ticker}
                        className="border-b border-white/6 text-sm text-white/80 transition hover:bg-cyan-400/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14)]"
                      >
                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleWatchlist(row)}
                            className="text-lg transition hover:scale-110"
                            title={
                              onWatchlist
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                          >
                            {onWatchlist ? (
                              <span className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
                                &#9733;
                              </span>
                            ) : (
                              <span className="text-white/25 hover:text-white/50">
                                &#9734;
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/stocks/${ticker}`}
                            className="text-base font-bold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                            onMouseEnter={(e) =>
                              handleTickerMouseEnter(row, e)
                            }
                            onMouseLeave={handleTickerMouseLeave}
                          >
                            {ticker}
                          </Link>
                        </td>

                        <td className="px-4 py-4 text-sm text-white/50">
                          {company || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {(() => {
                            const rd = getReadiness(row);
                            return (
                              <div className="relative inline-block group">
                                <div
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer select-none transition-all group-hover:scale-105 ${rd.bg}`}
                                >
                                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${rd.dot}`} />
                                  <span className={rd.text}>{rd.label}</span>
                                </div>
                                <div className="absolute z-50 left-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
                                  <ReadinessPopout row={row} r={rd} />
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4">
                          {row.most_recent_hat_date ? (
                            <div className="flex flex-col">
                              <span className="text-white/60 text-xs font-mono">
                                {new Date(row.most_recent_hat_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                              </span>
                              {row.most_recent_hat_price ? (
                                <span className="text-white/30 text-xs">
                                  ${Number(row.most_recent_hat_price).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-white/90">
                          {formatPrice(row.price)}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/stocks/${ticker}`}
                            className="inline-flex items-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/15"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ExpiredBlur>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <p className="text-white/20 text-xs">Aurora Readiness:</p>
        {[
          { dot: "bg-green-400", color: "text-green-400", label: "Ready (20%+ below peak, 3+ rises)" },
          { dot: "bg-amber-400", color: "text-amber-400", label: "Approaching (10–19%)" },
          { dot: "bg-red-400", color: "text-red-400", label: "Not ready (<10%)" },
          { dot: "bg-white/20", color: "text-white/30", label: "No signal (< 3 rises in 12m)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.dot}`} />
            <span className={`text-xs ${item.color}`}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="text-center text-[11px] text-white/25">
        Click any ticker for full analysis and investment calculator
      </div>
    </div>
  );
}
