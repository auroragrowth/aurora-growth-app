'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Trade {
  id: string
  company_name: string
  ticker: string | null
  date_entered: string | null
  date_exited: string | null
  bep_price: number | null
  num_shares: number | null
  sell_price: number | null
  current_price: number | null
  current_ppl: number | null
  funds_invested: number | null
  synced_from_t212: boolean | null
  status: 'open' | 'closed'
  notes: string | null
}

interface Deposit {
  id: string
  amount_usd: number
  deposit_date: string
  notes: string | null
}

const EMPTY_TRADE: Omit<Trade, 'id' | 'status'> = {
  company_name: '',
  ticker: null,
  date_entered: null,
  date_exited: null,
  bep_price: null,
  num_shares: null,
  sell_price: null,
  current_price: null,
  current_ppl: null,
  funds_invested: null,
  synced_from_t212: null,
  notes: null,
}

const fmt$ = (n: number | null | undefined) =>
  n == null ? '\u2014' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtPct = (n: number | null | undefined) =>
  n == null ? '\u2014' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'

export default function TrackerClient() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Trade>>({})

  const [showAddTrade, setShowAddTrade] = useState(false)
  const [newTrade, setNewTrade] = useState({ ...EMPTY_TRADE })

  const [showAddDeposit, setShowAddDeposit] = useState(false)
  const [newDeposit, setNewDeposit] = useState({ amount_usd: '', deposit_date: new Date().toISOString().split('T')[0], notes: '' })

  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from('investment_tracker').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('investment_tracker_deposits').select('*').eq('user_id', user.id).order('deposit_date', { ascending: false }),
    ])

    setTrades((t || []) as Trade[])
    setDeposits((d || []) as Deposit[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Computed stats
  const totalDeposited = deposits.reduce((s, d) => s + Number(d.amount_usd), 0)
  const closedTrades = trades.filter(t => t.status === 'closed' && t.bep_price && t.num_shares && t.sell_price)
  const openTrades = trades.filter(t => t.status === 'open')

  const totalInvested = closedTrades.reduce((s, t) => s + (Number(t.bep_price) * Number(t.num_shares)), 0)
  const totalProfit = closedTrades.reduce((s, t) => {
    const invested = Number(t.bep_price) * Number(t.num_shares)
    const proceeds = Number(t.sell_price) * Number(t.num_shares)
    return s + (proceeds - invested)
  }, 0)
  const avgProfitPct = closedTrades.length > 0
    ? closedTrades.reduce((s, t) => {
        const pct = ((Number(t.sell_price) - Number(t.bep_price)) / Number(t.bep_price)) * 100
        return s + pct
      }, 0) / closedTrades.length
    : null

  const profitColour = (pct: number) => pct > 0 ? '#34d399' : pct < 0 ? '#f87171' : 'var(--text-2)'

  // T212 sync
  const syncFromT212 = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('active_broker_mode').eq('id', user.id).single()
      const mode = profile?.active_broker_mode || 'live'

      const res = await fetch(`/api/tracker/sync?mode=${mode}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult(data.message)
      load()
    } catch (err: any) {
      setSyncResult(`Error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  // CRUD
  const addTrade = async () => {
    if (!newTrade.company_name.trim()) return
    setSaving('add')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('investment_tracker').insert({
      user_id: user.id,
      ...newTrade,
      status: 'open',
    })
    setNewTrade({ ...EMPTY_TRADE })
    setShowAddTrade(false)
    setSaving(null)
    load()
  }

  const saveTrade = async (id: string) => {
    setSaving(id)
    const supabase = createClient()
    const updates: Record<string, unknown> = { ...editData }
    if (updates.sell_price && updates.bep_price && updates.num_shares) {
      updates.status = 'closed'
    }
    await supabase.from('investment_tracker').update(updates).eq('id', id)
    setEditId(null)
    setEditData({})
    setSaving(null)
    load()
  }

  const deleteTrade = async (id: string) => {
    if (!confirm('Remove this trade?')) return
    const supabase = createClient()
    await supabase.from('investment_tracker').delete().eq('id', id)
    load()
  }

  const addDeposit = async () => {
    if (!newDeposit.amount_usd) return
    setSaving('deposit')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('investment_tracker_deposits').insert({
      user_id: user.id,
      amount_usd: parseFloat(newDeposit.amount_usd),
      deposit_date: newDeposit.deposit_date,
      notes: newDeposit.notes || null,
    })
    setNewDeposit({ amount_usd: '', deposit_date: new Date().toISOString().split('T')[0], notes: '' })
    setShowAddDeposit(false)
    setSaving(null)
    load()
  }

  const deleteDeposit = async (id: string) => {
    const supabase = createClient()
    await supabase.from('investment_tracker_deposits').delete().eq('id', id)
    load()
  }

  const startEdit = (trade: Trade) => {
    setEditId(trade.id)
    setEditData({
      company_name: trade.company_name,
      ticker: trade.ticker,
      date_entered: trade.date_entered,
      date_exited: trade.date_exited,
      bep_price: trade.bep_price,
      num_shares: trade.num_shares,
      sell_price: trade.sell_price,
      notes: trade.notes,
    })
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    width: '100%',
    outline: 'none',
  }

  const displayTrades = tab === 'open' ? openTrades : closedTrades

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Investment Tracker
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            Record your Aurora trades &mdash; enter on open, fill BEP and shares only when closing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncFromT212} disabled={syncing}
            className="aurora-btn aurora-btn-secondary aurora-btn-sm">
            {syncing ? '\u21BB Syncing...' : '\u21BB Sync T212'}
          </button>
          <button onClick={() => setShowAddDeposit(true)}
            className="aurora-btn aurora-btn-secondary aurora-btn-sm">
            + Deposit
          </button>
          <button onClick={() => setShowAddTrade(true)}
            className="aurora-btn aurora-btn-primary aurora-btn-sm">
            + Enter Trade
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{
            background: syncResult.startsWith('Error') ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
            border: `1px solid ${syncResult.startsWith('Error') ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
          }}>
          <p className="text-sm font-bold"
            style={{ color: syncResult.startsWith('Error') ? '#f87171' : '#34d399' }}>
            {syncResult}
          </p>
          <button onClick={() => setSyncResult(null)}
            style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none' }}>
            &times;
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Funds Deposited', value: fmt$(totalDeposited), icon: '\uD83D\uDCB0', colour: '#38d9f5' },
          { label: 'Total Invested', value: fmt$(totalInvested), icon: '\uD83D\uDCC8', colour: '#a78bfa' },
          { label: 'Total Profit', value: fmt$(totalProfit), icon: '\uD83D\uDCB5',
            colour: totalProfit >= 0 ? '#34d399' : '#f87171' },
          { label: 'Avg Profit %', value: fmtPct(avgProfitPct), icon: '\uD83D\uDCCA',
            colour: avgProfitPct == null ? 'var(--text-3)' : avgProfitPct >= 0 ? '#34d399' : '#f87171' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 16 }}>{stat.icon}</span>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: stat.colour }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Instructions banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>&#9888;&#65039;</span>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: '#fbbf24' }}>
            Important &mdash; how to use this tracker
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            <strong style={{ color: '#38d9f5' }}>Sync from T212</strong> to automatically import your open positions &mdash;
            BEP, shares, current price and P&amp;L all pulled live.
            When <strong style={{ color: '#34d399' }}>closing a trade</strong>, edit it to add your Sell Price and it will
            calculate your final profit. Do <strong style={{ color: '#f87171' }}>NOT</strong> fill in BEP or shares manually
            mid-trade &mdash; these change every time you add to a position.
          </p>
        </div>
      </div>

      {/* Trades table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Tab bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
            {(['open', 'closed'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
                style={{
                  background: tab === t ? 'rgba(56,217,245,0.15)' : 'transparent',
                  color: tab === t ? '#38d9f5' : 'var(--text-3)',
                  border: tab === t ? '1px solid rgba(56,217,245,0.25)' : '1px solid transparent',
                }}>
                {t} ({t === 'open' ? openTrades.length : closedTrades.length})
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {tab === 'open' ? 'Active trades \u2014 fill BEP/shares only when closing' : 'Closed trades \u2014 full P&L calculated'}
          </p>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  'Company', 'Ticker', 'Date Entered',
                  ...(tab === 'closed'
                    ? ['Date Exited', 'BEP ($)', 'Shares', 'Sell Price', 'Invested', 'Profit ($)', 'Profit %']
                    : ['BEP ($)', 'Shares', 'Invested', 'Current', 'P&L']),
                  ''
                ].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--text-3)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    {tab === 'open' ? 'No open trades \u2014 click "+ Enter Trade" to add your first' : 'No closed trades yet'}
                  </td>
                </tr>
              ) : displayTrades.map(trade => {
                const isEditing = editId === trade.id
                const invested = trade.bep_price && trade.num_shares
                  ? Number(trade.bep_price) * Number(trade.num_shares) : null
                const profit = trade.bep_price && trade.num_shares && trade.sell_price
                  ? (Number(trade.sell_price) - Number(trade.bep_price)) * Number(trade.num_shares) : null
                const profitPct = trade.bep_price && trade.sell_price
                  ? ((Number(trade.sell_price) - Number(trade.bep_price)) / Number(trade.bep_price)) * 100 : null

                return (
                  <tr key={trade.id}
                    className="transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: '1px solid var(--border)' }}>

                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <input value={editData.company_name || ''} style={inputStyle}
                          onChange={e => setEditData(p => ({ ...p, company_name: e.target.value }))} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                            {trade.company_name}
                          </p>
                          {trade.synced_from_t212 && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px',
                              borderRadius: 4, background: 'rgba(56,217,245,0.10)',
                              color: '#38d9f5', border: '1px solid rgba(56,217,245,0.2)',
                            }}>T212</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <input value={editData.ticker || ''} style={{ ...inputStyle, width: 70 }}
                          placeholder="NVDA"
                          onChange={e => setEditData(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} />
                      ) : (
                        <span className="font-mono text-xs font-bold" style={{ color: '#38d9f5' }}>
                          {trade.ticker || '\u2014'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      {isEditing ? (
                        <input type="date" value={editData.date_entered || ''} style={inputStyle}
                          onChange={e => setEditData(p => ({ ...p, date_entered: e.target.value }))} />
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                          {fmtDate(trade.date_entered)}
                        </span>
                      )}
                    </td>

                    {tab === 'open' && <>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                          {trade.bep_price ? fmt$(trade.bep_price) : '\u2014'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                          {trade.num_shares ?? '\u2014'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                          {trade.funds_invested ? fmt$(trade.funds_invested) : '\u2014'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                          {trade.current_price ? fmt$(trade.current_price) : '\u2014'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {trade.current_ppl != null ? (
                          <span className="font-mono text-sm font-bold"
                            style={{ color: Number(trade.current_ppl) >= 0 ? '#34d399' : '#f87171' }}>
                            {Number(trade.current_ppl) >= 0 ? '+' : ''}{fmt$(trade.current_ppl)}
                          </span>
                        ) : <span style={{ color: 'var(--text-3)' }}>{'\u2014'}</span>}
                      </td>
                    </>}

                    {tab === 'closed' && <>
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <input type="date" value={editData.date_exited || ''} style={inputStyle}
                            onChange={e => setEditData(p => ({ ...p, date_exited: e.target.value }))} />
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {fmtDate(trade.date_exited)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <input type="number" value={editData.bep_price ?? ''} style={{ ...inputStyle, width: 90 }}
                            placeholder="0.00" step="0.01"
                            onChange={e => setEditData(p => ({ ...p, bep_price: e.target.value ? parseFloat(e.target.value) : null }))} />
                        ) : (
                          <span className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                            {fmt$(trade.bep_price)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <input type="number" value={editData.num_shares ?? ''} style={{ ...inputStyle, width: 80 }}
                            placeholder="0"
                            onChange={e => setEditData(p => ({ ...p, num_shares: e.target.value ? parseFloat(e.target.value) : null }))} />
                        ) : (
                          <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                            {trade.num_shares ?? '\u2014'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <input type="number" value={editData.sell_price ?? ''} style={{ ...inputStyle, width: 90 }}
                            placeholder="0.00" step="0.01"
                            onChange={e => setEditData(p => ({ ...p, sell_price: e.target.value ? parseFloat(e.target.value) : null }))} />
                        ) : (
                          <span className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                            {fmt$(trade.sell_price)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                          {fmt$(invested)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm font-bold"
                          style={{ color: profit == null ? 'var(--text-3)' : profitColour(profit) }}>
                          {fmt$(profit)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono text-sm font-bold"
                          style={{ color: profitPct == null ? 'var(--text-3)' : profitColour(profitPct) }}>
                          {fmtPct(profitPct)}
                        </span>
                      </td>
                    </>}

                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => saveTrade(trade.id)}
                              disabled={saving === trade.id}
                              style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                                color: '#34d399', cursor: 'pointer',
                              }}>
                              {saving === trade.id ? '...' : 'Save'}
                            </button>
                            <button onClick={() => { setEditId(null); setEditData({}) }}
                              style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                color: 'var(--text-3)', cursor: 'pointer',
                              }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(trade)}
                              style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                                background: 'rgba(56,217,245,0.10)', border: '1px solid rgba(56,217,245,0.20)',
                                color: '#38d9f5', cursor: 'pointer',
                              }}>
                              Edit
                            </button>
                            <button onClick={() => deleteTrade(trade.id)}
                              style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)',
                                color: '#f87171', cursor: 'pointer',
                              }}>
                              &#10005;
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Closed trades totals footer */}
        {tab === 'closed' && closedTrades.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t flex-wrap gap-4"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total investments</p>
                <p className="font-bold font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                  {closedTrades.length}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total invested</p>
                <p className="font-bold font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                  {fmt$(totalInvested)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total profit</p>
                <p className="font-bold font-mono text-sm"
                  style={{ color: profitColour(totalProfit) }}>
                  {fmt$(totalProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Avg profit %</p>
                <p className="font-bold font-mono text-sm"
                  style={{ color: avgProfitPct == null ? 'var(--text-3)' : profitColour(avgProfitPct) }}>
                  {fmtPct(avgProfitPct)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deposits section */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
              Funds Deposited
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Record deposits into your trading account in USD
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://www.xe.com/" target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                color: '#38d9f5',
                textDecoration: 'none',
              }}>
              &pound; &rarr; $ Converter &#8599;
            </a>
            <span className="font-bold font-mono text-sm" style={{ color: '#38d9f5' }}>
              {fmt$(totalDeposited)}
            </span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Amount (USD)', 'Notes', ''].map(h => (
                  <th key={h} style={{
                    padding: '8px 14px', textAlign: 'left', fontSize: 10,
                    fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--text-3)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No deposits recorded &mdash; click &quot;+ Deposit&quot; to add one
                  </td>
                </tr>
              ) : deposits.map(dep => (
                <tr key={dep.id}
                  className="transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text-2)' }}>
                    {fmtDate(dep.deposit_date)}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <span className="font-mono font-bold text-sm" style={{ color: '#34d399' }}>
                      {fmt$(dep.amount_usd)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-3)' }}>
                    {dep.notes || '\u2014'}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <button onClick={() => deleteDeposit(dep.id)}
                      style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11,
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.18)',
                        color: '#f87171', cursor: 'pointer',
                      }}>&#10005;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddTrade(false) }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 480,
          }}>
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-1)' }}>
              Enter New Trade
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                  Company Name *
                </label>
                <input value={newTrade.company_name} style={inputStyle}
                  placeholder="e.g. Nvidia Corp"
                  onChange={e => setNewTrade(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                    Ticker
                  </label>
                  <input value={newTrade.ticker || ''} style={inputStyle}
                    placeholder="NVDA"
                    onChange={e => setNewTrade(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                    Date Entered
                  </label>
                  <input type="date" value={newTrade.date_entered || ''} style={inputStyle}
                    onChange={e => setNewTrade(p => ({ ...p, date_entered: e.target.value }))} />
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  &#9888;&#65039; <strong style={{ color: 'var(--text-1)' }}>Do not fill in BEP or shares yet</strong> &mdash;
                  add those only when you close the trade.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addTrade} disabled={saving === 'add' || !newTrade.company_name}
                className="aurora-btn aurora-btn-primary flex-1">
                {saving === 'add' ? 'Saving...' : 'Enter Trade'}
              </button>
              <button onClick={() => setShowAddTrade(false)}
                className="aurora-btn aurora-btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deposit Modal */}
      {showAddDeposit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddDeposit(false) }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
          }}>
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-1)' }}>
              Record Deposit
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                  Amount (USD) *
                </label>
                <input type="number" value={newDeposit.amount_usd} style={inputStyle}
                  placeholder="0.00" step="0.01"
                  onChange={e => setNewDeposit(p => ({ ...p, amount_usd: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                  Date
                </label>
                <input type="date" value={newDeposit.deposit_date} style={inputStyle}
                  onChange={e => setNewDeposit(p => ({ ...p, deposit_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-2)' }}>
                  Notes (optional)
                </label>
                <input value={newDeposit.notes} style={inputStyle}
                  placeholder="e.g. Initial deposit"
                  onChange={e => setNewDeposit(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg"
                style={{ background: 'var(--bg-hover)' }}>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Need to convert &pound; to $?
                </span>
                <a href="https://www.xe.com/" target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold" style={{ color: '#38d9f5', textDecoration: 'none' }}>
                  xe.com &rarr;
                </a>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addDeposit} disabled={saving === 'deposit' || !newDeposit.amount_usd}
                className="aurora-btn aurora-btn-primary flex-1">
                {saving === 'deposit' ? 'Saving...' : 'Record Deposit'}
              </button>
              <button onClick={() => setShowAddDeposit(false)}
                className="aurora-btn aurora-btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
