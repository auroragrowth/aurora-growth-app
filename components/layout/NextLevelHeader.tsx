"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAccountStatus } from "@/hooks/useAccountStatus";

type Props = {
  title?: string;
  subtitle?: string;
  userName?: string | null;
};

function formatMoney(value: number | null, currency = "USD") {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedMoney(value: number | null, currency = "USD") {
  if (value === null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(abs);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function InlineMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
      ? "text-rose-300"
      : "text-white";

  return (
    <div className="flex min-w-[110px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default function NextLevelHeader({
  title = "Investments",
  subtitle = "Aurora workspace",
  userName = "paulrudland",
}: Props) {
  const {
    connected,
    plan,
    portfolioValue,
    todayPnL,
    totalPnL,
    totalReturnPct,
    positionsCount,
    marketStatus,
    loading,
  } = useAccountStatus();

  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = String(userName || "A").charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(5,12,31,0.98),rgba(8,18,38,0.97),rgba(6,16,34,0.98))] px-4 py-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(2,8,23,0.35)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <div className="grid h-4 w-4 grid-cols-2 gap-0.5">
                <span className="rounded-[2px] bg-cyan-300/90" />
                <span className="rounded-[2px] bg-white/90" />
                <span className="rounded-[2px] bg-white/90" />
                <span className="rounded-[2px] bg-indigo-300/90" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.34em] text-cyan-200/60">
                Aurora Growth
              </div>
              <div className="truncate text-xl font-semibold text-white">
                {title}
              </div>
              <div className="truncate text-[11px] text-white/42">
                {subtitle}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:ml-4">
            <div
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                loading
                  ? "border-white/10 bg-white/5 text-white/50"
                  : connected
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-400/20 bg-rose-500/10 text-rose-300",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  loading
                    ? "bg-white/30"
                    : connected
                    ? "bg-emerald-400"
                    : "bg-rose-400",
                ].join(" ")}
              />
              {connected ? "Connected" : "Disconnected"}
            </div>

            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60">
              Market {marketStatus}
            </div>

            <div className="inline-flex items-center rounded-full border border-indigo-400/15 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-200">
              {plan}
            </div>

            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/55">
              {positionsCount} positions
            </div>

            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/45">
              {formatDateTime(now)}
            </div>
          </div>
        </div>

        <div ref={profileRef} className="relative self-start xl:self-center">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1.5 pl-3 text-left transition hover:bg-white/[0.08]"
          >
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-white">{userName}</div>
              <div className="text-[11px] text-white/40">{formatDateTime(now)}</div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
              {initial}
            </div>

            <ChevronDown
              className={[
                "mr-1 h-4 w-4 text-white/40 transition",
                menuOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[210px] rounded-2xl border border-cyan-300/10 bg-[#091425]/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="text-sm font-semibold text-white">{userName}</div>
                <div className="text-[11px] text-white/45">{formatDateTime(now)}</div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/dashboard/account"
                  className="block rounded-xl px-3 py-2 text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Account
                </Link>

                <Link
                  href="/dashboard/upgrade"
                  className="block rounded-xl px-3 py-2 text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Upgrade Plan
                </Link>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-200 transition hover:bg-red-400/10 hover:text-red-100"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <InlineMetric label="Portfolio" value={formatMoney(portfolioValue)} />
        <InlineMetric
          label="Today"
          value={formatSignedMoney(todayPnL)}
          tone={todayPnL !== null && todayPnL < 0 ? "negative" : "positive"}
        />
        <InlineMetric
          label="Open"
          value={formatSignedMoney(totalPnL)}
          tone={totalPnL !== null && totalPnL < 0 ? "negative" : "positive"}
        />
        <InlineMetric
          label="Return"
          value={formatPct(totalReturnPct)}
          tone={
            totalReturnPct !== null && totalReturnPct < 0 ? "negative" : "default"
          }
        />
      </div>
    </div>
  );
}
