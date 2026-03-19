"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  TrendingDown,
  TrendingUp,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";
import { usePortfolio } from "@/components/providers/PortfolioProvider";

type NextLevelHeaderProps = {
  title?: string;
  subtitle?: string;
  userName?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getUsMarketStatus() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  if (weekday === "Sat" || weekday === "Sun") {
    return {
      label: "Weekend",
      tone: "text-slate-300",
      dot: "bg-slate-500",
    };
  }

  const totalMinutes = hour * 60 + minute;

  const preMarketStart = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const regularClose = 16 * 60;

  if (totalMinutes >= preMarketStart && totalMinutes < regularOpen) {
    return {
      label: "Pre-market",
      tone: "text-amber-300",
      dot: "bg-amber-400",
    };
  }

  if (totalMinutes >= regularOpen && totalMinutes < regularClose) {
    return {
      label: "US Market OPEN",
      tone: "text-emerald-400",
      dot: "bg-emerald-400",
    };
  }

  return {
    label: "Closed",
    tone: "text-rose-300",
    dot: "bg-rose-400",
  };
}

function Sparkline({ values }: { values: number[] }) {
  const width = 120;
  const height = 24;
  const padding = 2;

  if (!values.length) {
    return (
      <div className="flex h-6 w-[120px] items-center">
        <div className="h-px w-full bg-cyan-400/30" />
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x =
        padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const up = values[values.length - 1] >= values[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={up ? "rgba(16,185,129,0.95)" : "rgba(244,63,94,0.95)"}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricItem({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  const UpDownIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-300">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        <UpDownIcon className="h-3.5 w-3.5" />
        {value}
      </span>
    </div>
  );
}

export default function NextLevelHeader({
  title = "Investments",
  subtitle = "Aurora platform workspace",
  userName = "paulrudland",
}: NextLevelHeaderProps) {
  const { data } = usePortfolio();
  const marketStatus = useMemo(() => getUsMarketStatus(), []);
  const [history, setHistory] = useState<number[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data.portfolioValue) return;

    setHistory((prev) => {
      const next = [...prev, data.portfolioValue];
      return next.slice(-18);
    });
  }, [data.portfolioValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const portfolioUp = data.portfolioValue >= data.openValue;
  const todayUp = data.todayPnl >= 0;
  const openUp = data.openValue <= data.portfolioValue;

  return (
    <div className="rounded-[26px] border border-cyan-500/20 bg-[#071a33]/90 px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.30em] text-cyan-300">
            Aurora Growth
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <span className="text-base text-slate-400">{subtitle}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span
              className={data.connected ? "text-emerald-400" : "text-rose-400"}
            >
              {data.connected ? "Connected" : "Disconnected"}
            </span>

            <span className="text-slate-500">|</span>

            <span className={`inline-flex items-center gap-2 font-medium ${marketStatus.tone}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${marketStatus.dot}`} />
              {marketStatus.label}
            </span>

            <span className="text-slate-500">|</span>

            <MetricItem
              label="Portfolio"
              value={formatMoney(data.portfolioValue)}
              positive={portfolioUp}
            />

            <div className="hidden md:flex items-center px-1">
              <Sparkline values={history} />
            </div>

            <span className="text-slate-500">|</span>

            <MetricItem
              label="Today"
              value={formatMoney(data.todayPnl)}
              positive={todayUp}
            />

            <span className="text-slate-500">|</span>

            <MetricItem
              label="Open"
              value={formatMoney(data.openValue)}
              positive={openUp}
            />
          </div>
        </div>

        <div ref={profileRef} className="relative flex shrink-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-2xl border border-cyan-400/10 px-2 py-1.5 transition hover:border-cyan-300/30 hover:bg-white/[0.03]"
          >
            <div className="text-right">
              <div className="text-sm text-cyan-300">Welcome</div>
              <div className="flex items-center justify-end gap-1 text-2xl text-white">
                <span>{userName}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a1c36]/98 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <Link
                href="/dashboard/account"
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.05]"
              >
                <User className="h-4 w-4 text-cyan-300" />
                Account
              </Link>

              <Link
                href="/dashboard/upgrade"
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.05]"
              >
                <CreditCard className="h-4 w-4 text-cyan-300" />
                Upgrade plan
              </Link>

              <form action="/auth/signout" method="post" className="border-t border-white/10">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
