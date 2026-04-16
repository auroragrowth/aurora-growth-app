export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AuroraMethodExplainer from '@/components/dashboard/AuroraMethodExplainer'
import MarketCountdown from '@/components/dashboard/MarketCountdown'
import MarketOverview from '@/components/dashboard/MarketOverview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, plan, plan_key, subscription_status, active_broker_mode')
    .eq('id', user.id)
    .single()

  const mode = profile?.active_broker_mode || 'live'
  const watchlistTable = mode === 'demo' ? 'watchlist_demo' : 'watchlist_live'

  const { count: watchlistCount } = await supabase
    .from(watchlistTable)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Top scanner picks — green first, then amber, then by score
  const { data: scannerStocks } = await supabase
    .from('scanner_results')
    .select('ticker, company, company_name, price, score, readiness, drop_from_hat_pct, most_recent_hat_price')
    .in('readiness', ['green', 'amber', 'red', 'grey'])
    .order('score', { ascending: false })
    .limit(6)

  // Sort: green first, then amber, then rest
  const sorted = (scannerStocks || []).sort((a: any, b: any) => {
    const order: Record<string, number> = { green: 0, amber: 1, red: 2, grey: 3 }
    const diff = (order[a.readiness] ?? 3) - (order[b.readiness] ?? 3)
    if (diff !== 0) return diff
    return (b.score ?? 0) - (a.score ?? 0)
  }).slice(0, 5)

  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const plan = profile?.plan_key ?? profile?.plan ?? 'core'
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  const readinessColour: Record<string, { text: string; bg: string; dot: string }> = {
    green: { text: '#34d399', bg: 'rgba(52,211,153,0.10)', dot: '#34d399' },
    amber: { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)', dot: '#fbbf24' },
    red:   { text: '#f87171', bg: 'rgba(248,113,113,0.10)', dot: '#f87171' },
    grey:  { text: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dot: '#94a3b8' },
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto space-y-6">

      {/* Market countdown */}
      <MarketCountdown />

      {/* Welcome hero */}
      <div className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(56,217,245,0.18)',
        }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#38d9f5', fontSize: 18 }}>✦</span>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
                {greeting}, {firstName}
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              Here&apos;s your Aurora overview for today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(251,191,36,0.12)',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.2)',
              }}>
              Aurora {planLabel}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold capitalize"
              style={{
                background: mode === 'live'
                  ? 'rgba(52,211,153,0.12)'
                  : 'rgba(245,158,11,0.12)',
                color: mode === 'live' ? '#34d399' : '#fbbf24',
                border: `1px solid ${mode === 'live' ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
              ● {mode}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Active Plan',
            value: `Aurora ${planLabel}`,
            icon: '⭐',
            colour: '#fbbf24',
          },
          {
            label: `${mode === 'live' ? 'Live' : 'Practice'} Watchlist`,
            value: `${watchlistCount ?? 0} stocks`,
            icon: '⭐',
            colour: '#38d9f5',
          },
          {
            label: 'Scanner',
            value: `${sorted.filter((s: any) => s.readiness === 'green').length} green today`,
            icon: '🟢',
            colour: '#34d399',
          },
        ].map(stat => (
          <div key={stat.label}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
              }}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aurora Method Explainer */}
      <AuroraMethodExplainer />

      {/* Market Overview */}
      <MarketOverview />

      {/* Top Scanner Picks — FULL WIDTH */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>
              Top Scanner Picks
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Highest scored Aurora stocks right now — green first
            </p>
          </div>
          <Link href="/dashboard/market-scanner"
            className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}>
            View all →
          </Link>
        </div>

        {/* Table wrapper */}
        <div style={{ width: '100%' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Ticker', 'Company', 'Price', 'Readiness', 'Drop from Peak', 'Last Peak', ''].map(h => (
                    <th key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-3)',
                        whiteSpace: 'nowrap',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: '40px 16px', textAlign: 'center',
                      color: 'var(--text-3)', fontSize: 13,
                    }}>
                      No scanner data yet — refresh the scanner to populate
                    </td>
                  </tr>
                ) : sorted.map((stock: any, i: number) => {
                  const rc = readinessColour[stock.readiness] || readinessColour.grey
                  const drop = stock.drop_from_hat_pct
                    ? `${parseFloat(stock.drop_from_hat_pct).toFixed(1)}%`
                    : '—'
                  const peak = stock.most_recent_hat_price
                    ? `$${parseFloat(stock.most_recent_hat_price).toFixed(2)}`
                    : '—'
                  const price = stock.price
                    ? `$${parseFloat(stock.price).toFixed(2)}`
                    : '—'
                  const companyName = stock.company || stock.company_name || stock.ticker

                  return (
                    <tr key={stock.ticker}
                      className="transition-colors hover:bg-[var(--bg-hover)]"
                      style={{
                        borderBottom: i < sorted.length - 1
                          ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Ticker */}
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/dashboard/stocks/${stock.ticker}`}
                          className="font-bold text-sm font-mono"
                          style={{ color: '#38d9f5' }}>
                          {stock.ticker}
                        </Link>
                      </td>

                      {/* Company */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 13, color: 'var(--text-1)',
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', maxWidth: 220,
                          display: 'block',
                        }}>
                          {companyName}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-bold font-mono text-sm"
                          style={{ color: 'var(--text-1)' }}>
                          {price}
                        </span>
                      </td>

                      {/* Readiness badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 999,
                          background: rc.bg,
                          fontSize: 11, fontWeight: 700,
                          color: rc.text, textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: rc.dot, display: 'inline-block',
                          }} />
                          {stock.readiness}
                        </span>
                      </td>

                      {/* Drop from peak */}
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-mono text-sm font-bold"
                          style={{
                            color: parseFloat(stock.drop_from_hat_pct || '0') >= 20
                              ? '#34d399'
                              : parseFloat(stock.drop_from_hat_pct || '0') >= 10
                              ? '#fbbf24' : 'var(--text-2)',
                          }}>
                          {drop}
                        </span>
                      </td>

                      {/* Last peak */}
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-mono text-sm"
                          style={{ color: 'var(--text-2)' }}>
                          {peak}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Add to watchlist star */}
                          <form action={async () => {
                            'use server'
                            const sb = await createClient()
                            const { data: { user: u } } = await sb.auth.getUser()
                            if (!u) return
                            const { data: p } = await sb.from('profiles')
                              .select('active_broker_mode').eq('id', u.id).single()
                            const tbl = (p?.active_broker_mode || 'live') === 'demo'
                              ? 'watchlist_demo' : 'watchlist_live'
                            await sb.from(tbl).upsert({
                              user_id: u.id,
                              symbol: stock.ticker,
                              company_name: companyName,
                            }, { onConflict: 'user_id,symbol' })
                          }}>
                            <button
                              type="submit"
                              title="Add to watchlist"
                              style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                color: '#fbbf24', cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 13,
                              }}>
                              ★
                            </button>
                          </form>

                          {/* View chart */}
                          <Link href={`/dashboard/stocks/${stock.ticker}`}
                            title="View chart"
                            style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12,
                            }}>
                            →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
