"use client";

import Link from "next/link";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { usePortfolio } from "@/components/providers/PortfolioProvider";

function formatMoney(value: number) {
  return `US$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardHomeClient() {
  const { data, refresh } = usePortfolio();
  const Icon = data.connected ? Wifi : WifiOff;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
      {!data.connected && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="text-sm font-semibold text-yellow-200">
            Connect your Trading 212 account
          </div>
          <p className="mt-1 text-sm text-yellow-100/80">
            Your Aurora account is active, but your broker connection is not set up yet.
          </p>
          <div className="mt-3">
            <Link
              href="/dashboard/connections"
              className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Set up connection
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="rounded-[32px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_28%),linear-gradient(180deg,rgba(5,17,38,0.98),rgba(2,10,25,0.98))] px-8 py-9 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
          <div className="mb-4 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.30em] text-cyan-300">
            Aurora Growth Workspace
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl">
            Invest with more clarity, stronger alignment, and better structure.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Aurora helps you move from ideas to decisions with a structured process.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/market-scanner"
              className="inline-flex items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20"
            >
              Open Scanner →
            </Link>

            <Link
              href="/dashboard/investments/calculator"
              className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
            >
              Calculator
            </Link>

            <Link
              href="/dashboard/watchlist"
              className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
            >
              View Watchlist
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Quality",
                text: "Focus on stronger businesses instead of chasing noise.",
              },
              {
                title: "Structure",
                text: "Build staged entries instead of guessing.",
              },
              {
                title: "Alignment",
                text: "Ensure stock, setup and market align.",
              },
              {
                title: "Discipline",
                text: "Define risk and exits before emotion.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300">
                  {item.title}
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[28px] border border-cyan-500/20 bg-[#081a34]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              Trading 212
            </h2>

            <button
              onClick={() => refresh(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              <RefreshCw className={data.loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2 text-sm">
            <div
              className={`rounded-full px-3 py-1.5 ${
                data.connected
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-rose-500/10 text-rose-300"
              }`}
            >
              <Icon className="mr-1 inline h-3.5 w-3.5" />
              {data.connected ? "Connected" : "Disconnected"}
            </div>

            <div className="rounded-full bg-white/5 px-3 py-1.5 text-slate-300">
              {data.count} positions
            </div>

            <div className="rounded-full bg-white/5 px-3 py-1.5 text-slate-300">
              {data.updatedAt
                ? new Date(data.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 p-4 mb-4">
            <div className="text-xs uppercase text-slate-400">
              Connection
            </div>
            <div className="mt-2 text-xl text-white">
              {data.connected ? "Connected" : "Disconnected"}
            </div>
          </div>

          {data.connected && (
            <div className="rounded-[22px] border border-cyan-400/20 p-4 mb-4">
              <div className="text-xs uppercase text-cyan-300">
                Portfolio
              </div>

              <div className="mt-2 text-2xl text-white">
                {formatMoney(data.portfolioValue)}
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Today: {formatMoney(data.todayPnl)}
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Open: {formatMoney(data.openValue)}
              </div>
            </div>
          )}

          {!data.loading && data.connected && data.count === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              No positions yet
            </div>
          )}

          {data.loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              Syncing...
            </div>
          )}

          {data.error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {data.error}
            </div>
          )}

          <div className="mt-5">
            <Link
              href="/dashboard/connections"
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              Manage connection →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
