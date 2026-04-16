'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import TrackerClient from './tracker/TrackerClient'

/* ── Types ── */

interface Order {
  id: number
  type: string
  quantity: number
  filled_price: number
  limit_price: number
  stop_price?: number | null
  total_value: number
  date: string
  status: string
}

interface ProfitTarget {
  pct: number
  price: number
  value: number
  profit: number
  reached_at: string | null
}

interface Position {
  symbol: string
  company: string
  ticker_t212: string
  quantity: number
  avg_price: number
  current_price: number
  total_invested: number
  current_value: number
  pnl: number
  pnl_pct: number
  fx_pnl: number
  days_invested: number
  first_invested_at: string | null
  filled_orders: Order[]
  cancelled_orders: number
  pending_orders: Order[]
  bep_price: number | null
  ladder_plan: any[] | null
  remaining_levels: number | null
  profit_targets: ProfitTarget[]
}

interface ApiData {
  connected: boolean
  mode: string
  account: any
  positions: Position[]
  total_positions: number
  total_value: number
  total_invested: number
  total_pnl: number
  error?: string
}

/* ── Helpers ── */

function fmt$(n: number) {
  if (!n && n !== 0) return '\u2014'
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtSigned$(n: number) {
  return `${n >= 0 ? '+' : '-'}${fmt$(n)}`
}

function fmtDate(d: string | null) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function fmtShortDate(d: string | null) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function fmtShares(n: number) {
  if (!n) return '\u2014'
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

function pnlColor(n: number) {
  return n > 0 ? 'text-green-400' : n < 0 ? 'text-red-400' : 'text-white/40'
}

function pnlBgSoft(n: number) {
  return n > 0 ? 'bg-green-400/10 border-green-400/20' : n < 0 ? 'bg-red-400/10 border-red-400/20' : 'bg-white/5 border-white/10'
}

const COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#a855f7',
  '#eab308', '#6366f1', '#22c55e', '#e11d48', '#0ea5e9',
]

/* ── Donut Chart ── */

function DonutChart({ slices, size = 180 }: {
  slices: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = slices.reduce((s, sl) => s + Math.abs(sl.value), 0)
  if (!total) return null
  const r = size / 2
  const sw = size * 0.17
  const radius = r - sw / 2
  const circ = 2 * Math.PI * radius
  let acc = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {slices.map((sl, i) => {
        const pct = Math.abs(sl.value) / total
        const dash = pct * circ
        const offset = -acc * circ
        acc += pct
        return (
          <circle key={i} cx={r} cy={r} r={radius} fill="none"
            stroke={sl.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            className="transition-all duration-700" />
        )
      })}
    </svg>
  )
}

/* ── P&L Bar ── */

function PnlBar({ pnl, max }: { pnl: number; max: number }) {
  const w = max ? Math.min(Math.abs(pnl) / max * 100, 100) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${pnl >= 0 ? 'bg-green-400/50' : 'bg-red-400/50'}`}
        style={{ width: `${w}%` }} />
    </div>
  )
}

/* ── Main Component ── */

export default function InvestmentsClient() {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/broker/investments', { cache: 'no-store', credentials: 'include' })
      const d = await res.json()
      if (!d.connected) {
        setError(d.error || 'Trading 212 not connected')
        setData(null)
      } else {
        setData(d)
      }
    } catch {
      setError('Failed to load investments')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const positions = data?.positions || []
  const totalValue = data?.total_value || 0
  const totalInvested = data?.total_invested || 0
  const totalPnl = data?.total_pnl || 0
  const totalReturn = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const maxPnl = Math.max(...positions.map(p => Math.abs(p.pnl)), 1)
  const freeCash = data?.account?.free || 0

  const donutSlices = useMemo(() =>
    positions.map((p, i) => ({
      label: p.symbol,
      value: p.current_value,
      color: COLORS[i % COLORS.length],
    })), [positions])

  const toggle = (sym: string) => setExpanded(prev => prev === sym ? null : sym)

  return (
    <div className="mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My Investments</h1>
          <p className="text-white/40 text-sm">Live from Trading 212{data?.mode ? ` \u00b7 ${data.mode}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="px-3 py-1.5 rounded-xl border border-white/10 text-white/40 text-xs
            hover:bg-white/5 hover:text-white transition-all">
            Refresh
          </button>
          {data?.connected && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
              bg-green-500/15 border border-green-500/25 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-56 rounded-2xl bg-white/5 animate-pulse" />
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
          <p className="text-red-400 font-bold">{error}</p>
          <p className="text-white/30 text-sm">
            Make sure your Trading 212 account is connected in{' '}
            <Link href="/dashboard/account" className="text-cyan-400 underline">Account Settings</Link>
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && data && positions.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10
            flex items-center justify-center text-3xl">📊</div>
          <p className="text-white/40">No open positions in your {data.mode} account</p>
        </div>
      )}

      {/* Data loaded */}
      {!loading && data && positions.length > 0 && (
        <>
          {/* ─── GRAPHICAL OVERVIEW ─── */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-center gap-8">

              {/* Donut */}
              <div className="relative flex-shrink-0">
                <DonutChart slices={donutSlices} size={180} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Portfolio</p>
                  <p className="text-white font-bold text-lg">{fmt$(totalValue)}</p>
                  <p className={`text-xs font-bold ${pnlColor(totalPnl)}`}>{fmtSigned$(totalPnl)}</p>
                </div>
              </div>

              {/* Stats + allocation */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { l: 'Portfolio Value', v: fmt$(totalValue), s: `${positions.length} positions` },
                    { l: 'Total Invested', v: fmt$(totalInvested), s: 'cost basis' },
                    { l: 'Total P&L', v: fmtSigned$(totalPnl), c: pnlColor(totalPnl), s: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%` },
                    { l: 'Free Cash', v: fmt$(freeCash), s: 'available' },
                  ].map(item => (
                    <div key={item.l} className="bg-white/[0.04] rounded-xl p-3">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">{item.l}</p>
                      <p className={`font-bold text-base ${item.c || 'text-white'}`}>{item.v}</p>
                      <p className={`text-[10px] mt-0.5 ${item.c || 'text-white/30'}`}>{item.s}</p>
                    </div>
                  ))}
                </div>

                {/* Allocation bar */}
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Allocation</p>
                  <div className="flex rounded-full overflow-hidden h-3 bg-white/5">
                    {positions.map((p, i) => {
                      const w = totalValue ? (p.current_value / totalValue) * 100 : 0
                      if (w < 0.5) return null
                      return (
                        <div key={p.symbol} title={`${p.symbol}: ${w.toFixed(1)}%`}
                          style={{ width: `${w}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full" />
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {positions.map((p, i) => {
                      const w = totalValue ? (p.current_value / totalValue) * 100 : 0
                      return (
                        <div key={p.symbol} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-white/50 text-[10px]">
                            {p.symbol} <span className="text-white/25">{w.toFixed(1)}%</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── POSITION CARDS ─── */}
          <div className="space-y-2">
            {positions.map((pos, idx) => {
              const isOpen = expanded === pos.symbol
              const color = COLORS[idx % COLORS.length]
              const alloc = totalValue ? (pos.current_value / totalValue) * 100 : 0

              return (
                <div key={pos.symbol} className="rounded-2xl overflow-hidden border border-white/10
                  bg-white/[0.03] transition-all hover:border-white/15">
                  <button onClick={() => toggle(pos.symbol)}
                    className="w-full flex items-center gap-4 p-4 md:p-5 text-left transition-all">

                    {/* Ticker badge with allocation ring */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0
                      flex items-center justify-center"
                      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                      <span className="font-bold text-xs text-white">{pos.symbol}</span>
                      <svg className="absolute inset-0" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="22" fill="none" stroke={`${color}20`} strokeWidth="2" />
                        <circle cx="24" cy="24" r="22" fill="none" stroke={color} strokeWidth="2"
                          strokeDasharray={`${(alloc / 100) * 138.2} 138.2`}
                          strokeLinecap="round"
                          className="transform -rotate-90 origin-center transition-all duration-700" />
                      </svg>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-white font-bold text-sm">{pos.symbol}</p>
                        {pos.company !== pos.symbol && (
                          <p className="text-white/25 text-xs truncate">{pos.company}</p>
                        )}
                        {pos.pending_orders.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                            bg-amber-500/20 border border-amber-500/30 text-amber-400">
                            {pos.pending_orders.length} pending
                          </span>
                        )}
                        {pos.filled_orders.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                            bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                            {pos.filled_orders.length} buys
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/35 flex-wrap">
                        <span>{fmtShortDate(pos.first_invested_at)}</span>
                        <span>{fmtShares(pos.quantity)} shares</span>
                        <span>Avg {fmt$(pos.avg_price)}</span>
                        <span>Now {fmt$(pos.current_price)}</span>
                        <span>{pos.days_invested}d</span>
                      </div>
                      <div className="mt-1.5 max-w-xs">
                        <PnlBar pnl={pos.pnl} max={maxPnl} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                      <div className="text-right w-20">
                        <p className="text-white/25 text-[10px]">Value</p>
                        <p className="text-white font-bold text-sm">{fmt$(pos.current_value)}</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="text-white/25 text-[10px]">P&L</p>
                        <p className={`font-bold text-sm ${pnlColor(pos.pnl)}`}>{fmtSigned$(pos.pnl)}</p>
                      </div>
                      <div className="text-right w-16">
                        <p className="text-white/25 text-[10px]">Return</p>
                        <p className={`font-bold text-sm ${pnlColor(pos.pnl_pct)}`}>
                          {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-right w-12">
                        <p className="text-white/25 text-[10px]">Weight</p>
                        <p className="text-white/60 font-bold text-sm">{alloc.toFixed(1)}%</p>
                      </div>
                    </div>

                    <span className={`text-white/20 text-xs flex-shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}>&#x25BC;</span>
                  </button>

                  {/* ─── DRILL DOWN ─── */}
                  {isOpen && (
                    <div className="border-t border-white/[0.06] p-5 space-y-6 bg-white/[0.01]">

                      {/* First Purchase card */}
                      {pos.filled_orders.length > 0 && (() => {
                        const first = pos.filled_orders[0]
                        return (
                          <div className="p-4 rounded-xl bg-cyan-400/[0.06] border border-cyan-400/15">
                            <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">First Purchase</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-white/25 text-[10px]">Date</p>
                                <p className="text-cyan-400 font-bold text-sm">{fmtDate(first.date)}</p>
                              </div>
                              <div>
                                <p className="text-white/25 text-[10px]">Price</p>
                                <p className="text-white font-bold text-sm">{fmt$(first.filled_price || first.limit_price)}</p>
                              </div>
                              <div>
                                <p className="text-white/25 text-[10px]">Amount</p>
                                <p className="text-white font-bold text-sm">{fmt$(first.total_value)}</p>
                              </div>
                              <div>
                                <p className="text-white/25 text-[10px]">Shares</p>
                                <p className="text-white font-bold text-sm">{fmtShares(first.quantity)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { l: 'Total Shares', v: fmtShares(pos.quantity) },
                          { l: 'Avg Price', v: fmt$(pos.avg_price) },
                          { l: 'Current Price', v: fmt$(pos.current_price) },
                          { l: 'Days Invested', v: `${pos.days_invested}` },
                          { l: 'Total Invested', v: fmt$(pos.total_invested) },
                          { l: 'Current Value', v: fmt$(pos.current_value) },
                          { l: 'P&L', v: fmtSigned$(pos.pnl), c: pnlColor(pos.pnl) },
                          { l: 'Return', v: `${pos.pnl_pct >= 0 ? '+' : ''}${pos.pnl_pct.toFixed(2)}%`, c: pnlColor(pos.pnl_pct) },
                        ].map(s => (
                          <div key={s.l} className="bg-white/[0.04] rounded-xl p-3">
                            <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">{s.l}</p>
                            <p className={`font-bold text-sm ${s.c || 'text-white'}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Cost vs Value gauge */}
                      <div className="bg-white/[0.03] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white/30 text-[10px] uppercase tracking-wider">Cost vs Value</p>
                          <p className={`text-xs font-bold ${pnlColor(pos.pnl)}`}>
                            {fmtSigned$(pos.pnl)} ({pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%)
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-white/30 text-[10px]">Cost</span>
                              <span className="text-white/50 text-[10px] font-bold">{fmt$(pos.total_invested)}</span>
                            </div>
                            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-white/15 transition-all duration-700"
                                style={{ width: `${Math.min((pos.total_invested / Math.max(pos.total_invested, pos.current_value)) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-white/30 text-[10px]">Value</span>
                              <span className={`text-[10px] font-bold ${pnlColor(pos.pnl)}`}>{fmt$(pos.current_value)}</span>
                            </div>
                            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${pos.pnl >= 0 ? 'bg-green-400/40' : 'bg-red-400/40'}`}
                                style={{ width: `${Math.min((pos.current_value / Math.max(pos.total_invested, pos.current_value)) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BEP */}
                      {pos.bep_price && (
                        <div className="p-3 rounded-xl bg-cyan-400/[0.08] border border-cyan-400/15 flex items-center gap-3">
                          <span className="text-lg">🎯</span>
                          <div>
                            <p className="text-cyan-400 font-bold text-sm">Break-even: {fmt$(pos.bep_price)}</p>
                            <p className="text-white/40 text-xs">
                              {pos.current_price > pos.bep_price
                                ? `Above BEP by ${fmt$(pos.current_price - pos.bep_price)}`
                                : `${fmt$(pos.bep_price - pos.current_price)} below BEP`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Buy History — card grid like profit targets */}
                      {(() => {
                        const orders = pos.filled_orders.length > 0
                          ? pos.filled_orders
                          : [{
                              id: `pos-${pos.symbol}`,
                              type: 'BUY',
                              quantity: pos.quantity,
                              filled_price: pos.avg_price,
                              limit_price: pos.avg_price,
                              total_value: pos.total_invested,
                              date: pos.first_invested_at,
                              status: 'Filled',
                            }]
                        return (
                          <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
                              Buy History ({orders.length} {orders.length === 1 ? 'order' : 'orders'})
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {orders.map((order, i) => {
                                const daysFromFirst = i > 0 && pos.first_invested_at && order.date
                                  ? Math.floor((new Date(order.date).getTime() - new Date(pos.first_invested_at).getTime()) / 86400000)
                                  : null
                                return (
                                  <div key={order.id || `order-${i}`}
                                    className={`rounded-xl p-3 border text-center transition-all ${
                                      i === 0
                                        ? 'bg-cyan-400/[0.08] border-cyan-400/20'
                                        : 'bg-green-400/[0.06] border-green-400/15'
                                    }`}>
                                    <p className={`text-lg font-bold ${i === 0 ? 'text-cyan-400' : 'text-green-400'}`}>
                                      {i === 0 ? 'Initial' : `#${i + 1}`}
                                    </p>
                                    <p className="text-white font-bold text-sm mt-0.5">
                                      {fmt$(order.filled_price || order.limit_price)}
                                    </p>
                                    <p className="text-white/25 text-[10px] mt-0.5">
                                      {fmtShares(order.quantity)} shares
                                    </p>
                                    {order.total_value > 0 && (
                                      <p className="text-white/30 text-[10px]">
                                        {fmt$(order.total_value)}
                                      </p>
                                    )}
                                    <p className={`text-[10px] mt-1 ${i === 0 ? 'text-cyan-400/70' : 'text-white/40'}`}>
                                      {fmtDate(order.date)}
                                    </p>
                                    {daysFromFirst !== null && (
                                      <p className="text-white/30 text-[9px]">
                                        +{daysFromFirst}d from initial
                                      </p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Pending orders */}
                      {pos.pending_orders.length > 0 && (
                        <div>
                          <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
                            Pending Orders ({pos.pending_orders.length})
                          </p>
                          <div className="space-y-1.5">
                            {pos.pending_orders.map(order => (
                              <div key={order.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                                <span className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-400
                                  border border-amber-400/25 flex items-center justify-center
                                  text-[10px] font-bold flex-shrink-0">⏳</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-amber-400 text-xs font-bold">Limit: {fmt$(order.limit_price)}</p>
                                    {order.stop_price && (
                                      <span className="text-[10px] text-white/25">Stop: {fmt$(order.stop_price)}</span>
                                    )}
                                    <span className="text-[10px] text-white/25">{fmtShares(order.quantity)} shares</span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold
                                      bg-amber-500/20 text-amber-400">{order.type}</span>
                                  </div>
                                  <p className="text-white/25 text-[10px] mt-0.5">Placed {fmtDate(order.date)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Profit targets */}
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-3">
                          Profit Targets from avg {fmt$(pos.avg_price)}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {pos.profit_targets.map(target => {
                            const hit = pos.current_price >= target.price
                            const reachedDays = target.reached_at && pos.first_invested_at
                              ? Math.floor((new Date(target.reached_at).getTime() - new Date(pos.first_invested_at).getTime()) / 86400000)
                              : null

                            // Stop loss logic — all targets set stop losses
                            // 10% hit → stop loss $5 above BEP
                            // 15% hit → stop loss $1 above 10% target price
                            // 20% hit → stop loss $1 above 15% target price
                            // 25% hit → stop loss $1 above 20% target price
                            const targets10 = pos.profit_targets.find(t => t.pct === 10)
                            const targets15 = pos.profit_targets.find(t => t.pct === 15)
                            const targets20 = pos.profit_targets.find(t => t.pct === 20)

                            let stopLossAction: { label: string; stopPrice: number } | null = null
                            if (target.pct === 10 && hit) {
                              const slPrice = (pos.bep_price || pos.avg_price) + 5
                              stopLossAction = { label: `Add Stop Loss @ ${fmt$(slPrice)}`, stopPrice: slPrice }
                            } else if (target.pct === 15 && hit && targets10) {
                              stopLossAction = { label: `Add Stop Loss @ ${fmt$(targets10.price + 1)}`, stopPrice: targets10.price + 1 }
                            } else if (target.pct === 20 && hit && targets15) {
                              stopLossAction = { label: `Add Stop Loss @ ${fmt$(targets15.price + 1)}`, stopPrice: targets15.price + 1 }
                            } else if (target.pct === 25 && hit && targets20) {
                              stopLossAction = { label: `Add Stop Loss @ ${fmt$(targets20.price + 1)}`, stopPrice: targets20.price + 1 }
                            }

                            return (
                              <div key={target.pct}
                                className={`rounded-xl p-3 border text-center transition-all flex flex-col ${
                                  hit ? 'bg-green-500/10 border-green-500/25' : 'bg-white/[0.03] border-white/[0.08]'
                                }`}>
                                <p className={`text-lg font-bold ${hit ? 'text-green-400' : 'text-white/50'}`}>
                                  {target.pct}%{hit ? ' ✓' : ''}
                                </p>
                                <p className={`text-sm font-bold mt-0.5 ${hit ? 'text-green-400' : 'text-white'}`}>
                                  {fmt$(target.price)}
                                </p>
                                <p className="text-white/25 text-[10px] mt-0.5">+{fmt$(target.profit)}</p>
                                {hit && target.reached_at ? (
                                  <>
                                    <p className="text-green-400/70 text-[10px] mt-1">
                                      {fmtDate(target.reached_at)}
                                    </p>
                                    {reachedDays !== null && (
                                      <p className="text-green-400/50 text-[9px]">
                                        {reachedDays}d from initial
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className={`text-[10px] mt-1 ${hit ? 'text-green-400/60' : 'text-white/20'}`}>
                                    {hit ? 'Reached' : `${fmt$(target.price - pos.current_price)} away`}
                                  </p>
                                )}
                                {stopLossAction && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const btn = e.currentTarget
                                      btn.disabled = true
                                      btn.textContent = 'Placing...'
                                      try {
                                        const res = await fetch('/api/broker/stop-loss', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          credentials: 'include',
                                          body: JSON.stringify({
                                            ticker: pos.symbol,
                                            quantity: pos.quantity,
                                            stopPrice: stopLossAction!.stopPrice,
                                            accountMode: data?.mode || 'live',
                                          })
                                        })
                                        const result = await res.json()
                                        if (result.success) {
                                          btn.textContent = 'Placed ✓'
                                          btn.classList.remove('from-cyan-400', 'to-purple-500')
                                          btn.classList.add('from-green-400', 'to-green-500')
                                        } else {
                                          alert(result.error || 'Failed to place stop loss')
                                          btn.textContent = stopLossAction!.label
                                          btn.disabled = false
                                        }
                                      } catch {
                                        alert('Failed to place stop loss')
                                        btn.textContent = stopLossAction!.label
                                        btn.disabled = false
                                      }
                                    }}
                                    className="mt-auto pt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold
                                      bg-gradient-to-r from-cyan-400 to-purple-500 text-white
                                      hover:brightness-110 transition-all disabled:opacity-50">
                                    {stopLossAction.label}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Ladder info */}
                      {pos.remaining_levels !== null && pos.remaining_levels > 0 && (
                        <div className="p-3 rounded-xl bg-purple-400/[0.08] border border-purple-400/15 flex items-center gap-3">
                          <span className="text-lg">🪜</span>
                          <div>
                            <p className="text-purple-400 font-bold text-sm">
                              Aurora Ladder: {pos.remaining_levels} level{pos.remaining_levels !== 1 ? 's' : ''} remaining
                            </p>
                            <p className="text-white/40 text-xs">From your Aurora investment calculator plan</p>
                          </div>
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-2 pt-1">
                        <Link href={`/dashboard/investments/${pos.symbol}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 border border-cyan-500/25
                          text-cyan-400 hover:bg-cyan-500/25 transition-all">
                          Full Analysis →
                        </Link>
                        <Link href={`/dashboard/stocks/${pos.symbol}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10
                          text-white/40 hover:text-white hover:bg-white/10 transition-all">
                          Stock Page
                        </Link>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Investment Tracker section */}
      <div className="mt-10 border-t border-white/8 pt-8">
        <TrackerClient />
      </div>
    </div>
  )
}
