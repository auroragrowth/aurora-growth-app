"use client";

import { useEffect, useState } from "react";

/* ── US market holidays 2026 ── */
const US_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-11-27",
  "2026-12-25",
]);

type MarketState = "open" | "pre" | "after" | "closed" | "weekend" | "holiday";

function getET(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

const PRE_OPEN = 4 * 60;       // 04:00
const MARKET_OPEN = 9 * 60 + 30; // 09:30
const MARKET_CLOSE = 16 * 60;    // 16:00
const AFTER_CLOSE = 20 * 60;     // 20:00

function getState(et: Date): MarketState {
  const dow = et.getDay();
  if (dow === 0 || dow === 6) return "weekend";
  if (US_HOLIDAYS.has(dateKey(et))) return "holiday";

  const mins = minutesSinceMidnight(et);
  if (mins >= MARKET_OPEN && mins < MARKET_CLOSE) return "open";
  if (mins >= PRE_OPEN && mins < MARKET_OPEN) return "pre";
  if (mins >= MARKET_CLOSE && mins < AFTER_CLOSE) return "after";
  return "closed";
}

function msUntilET(targetMins: number, et: Date): number {
  const nowMs =
    et.getHours() * 3600000 +
    et.getMinutes() * 60000 +
    et.getSeconds() * 1000 +
    et.getMilliseconds();
  const targetMs = targetMins * 60000;
  return targetMs - nowMs;
}

function msUntilNextOpen(et: Date): number {
  const dow = et.getDay();
  let daysAhead = 0;

  // Find the next weekday
  const nowMins = minutesSinceMidnight(et);
  if (dow >= 1 && dow <= 5 && nowMins < MARKET_OPEN && !US_HOLIDAYS.has(dateKey(et))) {
    daysAhead = 0;
  } else {
    // Move to next day and find next weekday non-holiday
    let d = new Date(et);
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() + 1);
      const dw = d.getDay();
      if (dw >= 1 && dw <= 5 && !US_HOLIDAYS.has(dateKey(d))) {
        daysAhead = i;
        break;
      }
    }
  }

  if (daysAhead === 0) {
    return msUntilET(MARKET_OPEN, et);
  }

  const msLeftToday = 86400000 - (
    et.getHours() * 3600000 +
    et.getMinutes() * 60000 +
    et.getSeconds() * 1000 +
    et.getMilliseconds()
  );
  return msLeftToday + (daysAhead - 1) * 86400000 + MARKET_OPEN * 60000;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");

  if (days > 0) return `${days}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s}s`;
}

const CFG: Record<MarketState, { label: string; dot: string; color: string; border: string; bg: string }> = {
  open:    { label: "OPEN",           dot: "bg-[#22c55e]", color: "text-[#22c55e]", border: "border-[#22c55e]/20", bg: "bg-[#22c55e]/8" },
  pre:     { label: "PRE-MARKET",     dot: "bg-[#f59e0b]", color: "text-[#f59e0b]", border: "border-[#f59e0b]/20", bg: "bg-[#f59e0b]/8" },
  after:   { label: "AFTER-HOURS",    dot: "bg-[#f97316]", color: "text-[#f97316]", border: "border-[#f97316]/20", bg: "bg-[#f97316]/8" },
  closed:  { label: "CLOSED",         dot: "bg-[#ef4444]", color: "text-[#ef4444]", border: "border-[#ef4444]/20", bg: "bg-[#ef4444]/8" },
  weekend: { label: "CLOSED",         dot: "bg-[#6b7280]", color: "text-[#6b7280]", border: "border-[#6b7280]/20", bg: "bg-[#6b7280]/8" },
  holiday: { label: "HOLIDAY CLOSED", dot: "bg-[#ef4444]", color: "text-[#ef4444]", border: "border-[#ef4444]/20", bg: "bg-[#ef4444]/8" },
};

function getCountdown(state: MarketState, et: Date): { prefix: string; time: string } {
  switch (state) {
    case "open":
      return { prefix: "Closes in", time: formatCountdown(msUntilET(MARKET_CLOSE, et)) };
    case "pre":
      return { prefix: "Opens in", time: formatCountdown(msUntilET(MARKET_OPEN, et)) };
    case "after":
      return { prefix: "Closes in", time: formatCountdown(msUntilET(AFTER_CLOSE, et)) };
    case "closed":
      return { prefix: "Opens in", time: formatCountdown(msUntilNextOpen(et)) };
    case "weekend":
      return { prefix: "Opens Monday in", time: formatCountdown(msUntilNextOpen(et)) };
    case "holiday":
      return { prefix: "Opens tomorrow in", time: formatCountdown(msUntilNextOpen(et)) };
  }
}

export default function MarketCountdown() {
  const [state, setState] = useState<MarketState>("closed");
  const [countdown, setCountdown] = useState({ prefix: "", time: "" });

  useEffect(() => {
    function tick() {
      const et = getET();
      const s = getState(et);
      setState(s);
      setCountdown(getCountdown(s, et));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cfg = CFG[state];

  return (
    <div className={`flex h-12 items-center justify-between rounded-2xl border ${cfg.border} ${cfg.bg} px-5`}>
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} shadow-[0_0_8px_currentColor]`} />
        <span className="text-sm font-semibold text-white">
          NYSE <span className="text-white/40">·</span> NASDAQ
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg}`}>
          {cfg.label}
        </span>
      </div>
      <div className="text-sm text-slate-300">
        {countdown.prefix}{" "}
        <span className="font-mono font-semibold tabular-nums text-white">{countdown.time}</span>
      </div>
    </div>
  );
}
