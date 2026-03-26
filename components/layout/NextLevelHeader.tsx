"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePortfolio } from "@/components/providers/PortfolioProvider";

type Props = {
  title: string;
  subtitle?: string;
  userName?: string;
};

type AccountStatusResponse = Record<string, any>;

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getFirstName(name?: string | null) {
  if (!name) return "User";

  const cleaned = String(name)
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "User";

  return toTitleCase(cleaned.split(" ")[0] || "User");
}

function getPlanTheme(plan?: string | null) {
  const value = String(plan || "").toLowerCase();

  if (value === "core") {
    return {
      pill: "border-cyan-400/25 bg-cyan-500/10",
      name: "text-cyan-300",
    };
  }

  if (value === "pro") {
    return {
      pill: "border-fuchsia-400/25 bg-fuchsia-500/10",
      name: "text-fuchsia-300",
    };
  }

  if (value === "elite") {
    return {
      pill: "border-amber-300/25 bg-amber-400/10",
      name: "text-amber-300",
    };
  }

  return {
    pill: "border-white/10 bg-white/5",
    name: "text-white",
  };
}

function formatMoney(value: number) {
  return `US$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getMarketLabel() {
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
  const totalMinutes = hour * 60 + minute;

  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

  if (!isWeekday) {
    return { label: "Closed", color: "text-rose-300" };
  }

  // NYSE: 09:30–16:00 ET; pre-market from 04:00 ET
  if (totalMinutes >= 570 && totalMinutes < 960) {
    return { label: "US Market OPEN", color: "text-emerald-300" };
  }

  if (totalMinutes >= 240 && totalMinutes < 570) {
    return { label: "Pre-market", color: "text-amber-300" };
  }

  return { label: "Closed", color: "text-rose-300" };
}

export default function NextLevelHeader({
  title,
  userName = "User",
}: Props) {
  const { data } = usePortfolio();

  const [plan, setPlan] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string>(userName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketTick, setMarketTick] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAccountStatus() {
      try {
        const accountRes = await fetch("/api/account/status", {
          cache: "no-store",
          credentials: "include",
        });

        if (!mounted || !accountRes.ok) return;

        const account = (await accountRes.json()) as AccountStatusResponse;

        setPlan(account?.plan ?? account?.plan_name ?? null);

        const bestName =
          account?.first_name ||
          account?.full_name ||
          account?.name ||
          account?.user_name ||
          account?.username ||
          userName;

        setResolvedName(bestName || userName);
      } catch (error) {
        console.error("Failed to load account status", error);
      }
    }

    loadAccountStatus();

    return () => {
      mounted = false;
    };
  }, [userName]);

  useEffect(() => {
    const id = setInterval(() => setMarketTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstName = useMemo(() => getFirstName(resolvedName), [resolvedName]);
  const planTheme = useMemo(() => getPlanTheme(plan), [plan]);
  const market = useMemo(() => getMarketLabel(), [marketTick]);

  const connected = data.connected;
  const portfolioValue = data.portfolioValue;
  const todayValue = data.todayPnl;
  const openValue = data.openValue;

  const connectionText = connected ? "Connected" : "Disconnected";
  const connectionColor = connected ? "text-emerald-300" : "text-rose-300";

  const pnlColor = (value: number) =>
    value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-cyan-300";

  return (
    <div className="w-full rounded-[28px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(4,21,45,0.92),rgba(2,14,31,0.94))] px-5 py-4 shadow-[0_0_40px_rgba(4,20,50,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.34em]">
            <span className="bg-[linear-gradient(90deg,#3dd9ff_0%,#5b8cff_35%,#a855f7_68%,#ec4899_100%)] bg-clip-text text-transparent">
              AURORA GROWTH ACADEMY
            </span>
          </div>

          <h1 className="truncate text-3xl font-semibold text-white sm:text-4xl">
            {title}
          </h1>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-white/85 backdrop-blur transition hover:bg-white/10 ${planTheme.pill}`}
          >
            <span className="text-white/70">Welcome</span>
            <span className={planTheme.name}>{firstName}</span>
            <ChevronDown className={`h-4 w-4 text-white/70 transition ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#091426]/95 p-2 shadow-2xl backdrop-blur-xl">
              <Link
                href="/dashboard/account"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Account
              </Link>

              <Link
                href="/dashboard/upgrade"
                onClick={() => setMenuOpen(false)}
                className="mt-1 block rounded-xl px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Upgrade
              </Link>

              <form action="/auth/signout" method="post" className="mt-1">
                <button
                  type="submit"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className={connectionColor}>{connectionText}</span>
        <span className="text-white/18">|</span>

        <span className={market.color}>{market.label}</span>
        <span className="text-white/18">|</span>

        <span className="text-white/70">Portfolio</span>
        <span className={pnlColor(portfolioValue)}>{formatMoney(portfolioValue)}</span>
        <span className="mx-1 hidden h-px w-20 bg-cyan-300/20 lg:block" />

        <span className="text-white/70">Today</span>
        <span className={pnlColor(todayValue)}>{formatMoney(todayValue)}</span>

        <span className="text-white/18">|</span>

        <span className="text-white/70">Open</span>
        <span className={pnlColor(openValue)}>{formatMoney(openValue)}</span>

        {data.updatedAt ? (
          <>
            <span className="text-white/18">|</span>
            <span className="text-white/50">
              Last sync{" "}
              {new Date(data.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
