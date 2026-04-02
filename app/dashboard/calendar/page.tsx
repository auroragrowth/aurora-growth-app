'use client'

import EconomicCalendar from '@/components/tradingview/EconomicCalendar'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 inline-flex w-fit items-center rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Economic Calendar
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Upcoming Economic Events
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Track key economic releases, central bank decisions, and market-moving events.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#08111f] p-4">
        <EconomicCalendar />
      </div>
    </div>
  )
}
