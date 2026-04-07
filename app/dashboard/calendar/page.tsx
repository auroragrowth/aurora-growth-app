'use client'

import EconomicCalendar from '@/components/tradingview/EconomicCalendar'

export default function CalendarPage() {
  return (
    <div className="-mx-4 -my-5 sm:-mx-6 lg:-mx-8 flex flex-col" style={{ height: 'calc(100vh - 76px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/5">
        <h1 className="text-xl font-bold text-white">
          Upcoming Economic Events
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          High-impact events that may affect your watchlist stocks
        </p>
      </div>

      {/* Full height calendar widget */}
      <div className="flex-1 min-h-0">
        <EconomicCalendar />
      </div>
    </div>
  )
}
