'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme/ThemeProvider'
import ComplianceStatus from '@/components/compliance/ComplianceStatus'

interface Profile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  plan: string | null
  plan_key: string | null
  subscription_status: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  billing_interval: string | null
  trading212_connected: boolean | null
  telegram_connected: boolean | null
  telegram_username: string | null
  telegram_chat_id: string | null
  compliance_accepted: boolean | null
  compliance_accepted_at: string | null
  is_admin: boolean | null
  created_at: string
  last_login_at: string | null
  notify_telegram: boolean | null
  notify_email: boolean | null
}

interface PriceAlert {
  id: string
  symbol: string
  company_name: string | null
  alert_type: string
  target_price: number
  is_active: boolean
  created_at: string
}

type Tab = 'profile' | 'plan' | 'connections' | 'alerts' | 'appearance' | 'security' | 'compliance'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile',     label: 'Profile',      icon: '👤' },
  { id: 'plan',        label: 'Plan',         icon: '⭐' },
  { id: 'connections', label: 'Connections',  icon: '🔗' },
  { id: 'alerts',      label: 'Alerts',       icon: '🔔' },
  { id: 'appearance',  label: 'Appearance',   icon: '🎨' },
  { id: 'security',    label: 'Security',     icon: '🛡️' },
  { id: 'compliance',  label: 'Compliance',   icon: '📋' },
]

const PLAN_LABELS: Record<string, { name: string; colour: string; bg: string }> = {
  core:  { name: 'Core',  colour: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  pro:   { name: 'Pro',   colour: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  elite: { name: 'Elite', colour: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
}

export default function AccountClient() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  const [tab, setTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [isOAuthUser, setIsOAuthUser] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)

    // Detect OAuth users — they cannot change passwords
    const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || ''
    setIsOAuthUser(provider === 'google' || provider === 'github' || provider === 'apple')

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (p) {
      setProfile(p as Profile)
      setFirstName((p as any).first_name || '')
      setLastName((p as any).last_name || '')
    }

    const { data: a } = await supabase
      .from('price_alerts')
      .select('id, symbol, company_name, alert_type, target_price, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setAlerts((a as PriceAlert[]) || [])

    const { data: pl } = await supabase
      .from('stripe_plans')
      .select('plan_key, plan_name, display_monthly, display_yearly_monthly, display_yearly_total')
      .eq('is_active', true)
      .order('display_monthly', { ascending: true })
    setPlans(pl || [])

    setLoading(false)
  }

  const handleUpgrade = async (planKey: string) => {
    setCheckingOut(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, billingInterval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setCheckingOut(null)
    }
  }

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadData()
  }

  const deleteAlert = async (id: string) => {
    const supabase = createClient()
    await supabase.from('price_alerts').update({ is_active: false }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  const planInfo = PLAN_LABELS[profile?.plan_key || profile?.plan || 'core'] || PLAN_LABELS.core
  const telegramConnected = !!(profile?.telegram_connected || profile?.telegram_chat_id)

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="h-20 rounded-2xl animate-pulse"
          style={{ background: 'var(--bg-card)' }} />
      ))}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          My Account
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          Manage your profile, plan, connections and preferences
        </p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">

        <div className="md:w-56 flex-shrink-0">
          <div className="rounded-2xl overflow-hidden sticky top-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {TABS.map(t => (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b last:border-b-0"
                style={{
                  borderColor: 'var(--border)',
                  background: tab === t.id ? 'rgba(8,145,178,0.10)' : 'transparent',
                  borderLeft: tab === t.id ? '3px solid #38d9f5' : '3px solid transparent',
                }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span className="text-sm font-bold" style={{
                  color: tab === t.id ? '#38d9f5' : 'var(--text-2)'
                }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">

          {tab === 'profile' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>Profile</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Your personal details
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(99,102,241,0.2))',
                      border: '1px solid var(--border)',
                      color: '#38d9f5',
                    }}>
                    {(firstName || profile?.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-1)' }}>
                      {firstName || profile?.full_name || 'Aurora Member'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {profile?.email}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{ background: planInfo.bg, color: planInfo.colour }}>
                      {planInfo.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1.5"
                      style={{ color: 'var(--text-2)' }}>First name</label>
                    <input type="text" value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        outline: 'none',
                      }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1.5"
                      style={{ color: 'var(--text-2)' }}>Last name</label>
                    <input type="text" value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        outline: 'none',
                      }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5"
                    style={{ color: 'var(--text-2)' }}>Email</label>
                  <input type="text" value={profile?.email || ''} disabled
                    className="w-full rounded-xl px-3 py-2.5 text-sm opacity-50"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Email cannot be changed here — contact support
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5"
                    style={{ color: 'var(--text-2)' }}>Member since</label>
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                    {profile?.created_at ? fmt(profile.created_at) : '—'}
                  </p>
                </div>

                <button onClick={saveProfile} disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(90deg, #0891b2, #6366f1)' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {tab === 'plan' && (
            <div className="space-y-4">
              {/* Current plan card */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>Your Plan</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Manage your Aurora subscription
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: planInfo.bg, border: `1px solid ${planInfo.colour}30` }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1"
                        style={{ color: planInfo.colour }}>Current plan</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
                        Aurora {planInfo.name}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
                        {profile?.subscription_status === 'active' ? '\u2713 Active' : profile?.subscription_status || 'Active'}
                        {profile?.billing_interval && ` \u00b7 Billed ${profile.billing_interval}`}
                      </p>
                    </div>
                    <span className="text-4xl">{planInfo.name === 'Elite' ? '\uD83D\uDC51' : planInfo.name === 'Pro' ? '\u2B50' : '\uD83C\uDF31'}</span>
                  </div>

                  {profile?.current_period_end && (
                    <div className="flex items-center justify-between py-3"
                      style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {profile.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                        {fmt(profile.current_period_end)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing toggle */}
              <div className="flex items-center justify-center">
                <div className="inline-flex rounded-full p-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <button onClick={() => setBillingInterval('monthly')}
                    className="rounded-full px-4 py-1.5 text-xs font-bold transition-all"
                    style={{
                      background: billingInterval === 'monthly' ? 'rgba(56,217,245,0.15)' : 'transparent',
                      color: billingInterval === 'monthly' ? '#38d9f5' : 'var(--text-3)',
                    }}>
                    Monthly
                  </button>
                  <button onClick={() => setBillingInterval('yearly')}
                    className="rounded-full px-4 py-1.5 text-xs font-bold transition-all"
                    style={{
                      background: billingInterval === 'yearly' ? 'rgba(56,217,245,0.15)' : 'transparent',
                      color: billingInterval === 'yearly' ? '#38d9f5' : 'var(--text-3)',
                    }}>
                    Yearly
                    <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan: any) => {
                  const currentPlanKey = (profile as any)?.plan_key || (profile as any)?.plan || 'core'
                  const isCurrent = currentPlanKey === plan.plan_key
                  const isPopular = plan.plan_key === 'pro'
                  const price = billingInterval === 'yearly' ? plan.display_yearly_monthly : plan.display_monthly

                  return (
                    <div key={plan.plan_key}
                      className="rounded-2xl p-5 transition-all"
                      style={{
                        background: 'var(--bg-card)',
                        border: isCurrent
                          ? `1px solid ${planInfo.colour}60`
                          : '1px solid var(--border)',
                        boxShadow: isCurrent
                          ? `0 0 0 2px ${planInfo.colour}40, 0 8px 30px rgba(0,0,0,0.2)`
                          : 'none',
                      }}>
                      {isCurrent ? (
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-3"
                          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          Current Plan
                        </span>
                      ) : isPopular ? (
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-3"
                          style={{ background: 'rgba(56,217,245,0.12)', color: '#38d9f5', border: '1px solid rgba(56,217,245,0.25)' }}>
                          Most Popular
                        </span>
                      ) : <div className="h-[22px] mb-3" />}

                      <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
                        {plan.plan_name}
                      </p>

                      <div className="mt-3 flex items-end gap-1">
                        <span className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>
                          &pound;{price?.toFixed(2)}
                        </span>
                        <span className="text-xs pb-1" style={{ color: 'var(--text-3)' }}>
                          /{billingInterval === 'yearly' ? 'mo billed annually' : 'month'}
                        </span>
                      </div>
                      {billingInterval === 'yearly' && plan.display_yearly_total && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                          &pound;{plan.display_yearly_total.toFixed(2)} per year
                        </p>
                      )}

                      <div className="mt-5">
                        {isCurrent ? (
                          <div className="w-full py-2.5 rounded-xl text-center text-sm font-bold"
                            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                            Your current plan
                          </div>
                        ) : (
                          <button onClick={() => handleUpgrade(plan.plan_key)}
                            disabled={!!checkingOut}
                            className="aurora-btn aurora-btn-primary w-full"
                            style={{ height: 42 }}>
                            {checkingOut === plan.plan_key ? 'Redirecting...' : `Choose ${plan.plan_name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-xs" style={{ color: 'var(--text-3)' }}>
                No free trials. Cancel any time from your Stripe dashboard.
              </p>
            </div>
          )}

          {tab === 'connections' && (
            <div className="space-y-4">

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b flex items-center justify-between"
                  style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Trading 212</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Connect your broker to track live positions
                    </p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: 'Live Account (Invest)', type: 'live' },
                    { label: 'Practice Account', type: 'demo' },
                  ].map(acct => (
                    <div key={acct.type}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{acct.label}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: profile?.trading212_connected ? '#34d399' : '#f87171',
                            display: 'inline-block'
                          }} />
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {profile?.trading212_connected ? 'Connected' : 'Not connected'}
                          </span>
                        </div>
                      </div>
                      <a href="/dashboard/connections"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(90deg, #0891b2, #6366f1)' }}>
                        {profile?.trading212_connected ? 'Manage' : 'Connect'}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Telegram Alerts</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Receive instant price alerts on your phone
                  </p>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                        Aurora Growth Academy — Alerts
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: telegramConnected ? '#34d399' : '#f87171',
                          display: 'inline-block'
                        }} />
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {telegramConnected
                            ? `Connected${profile?.telegram_username ? ` · @${profile.telegram_username}` : ''}`
                            : 'Not connected'}
                        </span>
                      </div>
                    </div>
                    <a href="/dashboard/connections"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(90deg, #0891b2, #6366f1)' }}>
                      {telegramConnected ? 'Manage' : 'Connect'}
                    </a>
                  </div>
                  {!telegramConnected && (
                    <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      Connect Telegram to receive instant price alerts the moment a stock
                      hits your entry level — no need to watch charts.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Notification Preferences</h3>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: 'Telegram notifications', key: 'notify_telegram', value: profile?.notify_telegram },
                    { label: 'Email notifications', key: 'notify_email', value: profile?.notify_email },
                  ].map(pref => (
                    <div key={pref.key}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-1)' }}>{pref.label}</span>
                      <span className="text-xs" style={{
                        color: pref.value ? '#34d399' : 'var(--text-3)'
                      }}>
                        {pref.value ? 'On' : 'Off'}
                      </span>
                    </div>
                  ))}
                  <a href="/dashboard/connections"
                    className="text-xs font-bold" style={{ color: '#38d9f5' }}>
                    Manage notifications in Connections →
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>Price Alerts</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <a href="/dashboard/watchlist"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-2)',
                  }}>
                  + Add alert
                </a>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-3xl mb-2">🔔</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
                      No active alerts
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                      Set price alerts from the bell icon on your watchlist
                    </p>
                  </div>
                ) : alerts.map(alert => (
                  <div key={alert.id}
                    className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: 'rgba(8,145,178,0.1)',
                          color: '#38d9f5',
                          border: '1px solid rgba(8,145,178,0.2)',
                        }}>
                        {alert.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                          {alert.symbol}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {alert.alert_type?.includes('above') ? '↑ Above' : '↓ Below'} ${Number(alert.target_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        color: '#f87171',
                      }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>Appearance</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Choose how Aurora looks on your device
                </p>
              </div>
              <div className="p-5 space-y-5">

                <div className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
                      {isLight ? '☀️  Light mode' : '🌙  Dark mode'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {isLight
                        ? 'White background — easier in bright environments'
                        : 'Dark background — Aurora deep blue theme'}
                    </p>
                  </div>
                  <button onClick={toggle}
                    style={{
                      position: 'relative', width: 52, height: 28,
                      borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: isLight
                        ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                        : 'linear-gradient(90deg, #1e1b4b, #4338ca)',
                      transition: 'background 0.3s', padding: 0,
                      flexShrink: 0,
                    }}>
                    <span style={{
                      position: 'absolute', top: 4,
                      left: isLight ? 28 : 4, width: 20, height: 20,
                      borderRadius: '50%', background: '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                      transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11,
                    }}>
                      {isLight ? '☀️' : '🌙'}
                    </span>
                  </button>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-3)' }}>Select theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: 'dark', label: '🌙 Dark', desc: 'Aurora deep blue',
                        preview: { bg: '#020c1b', card: '#071830', accent: 'rgba(56,217,245,0.3)' }
                      },
                      {
                        id: 'light', label: '☀️ Light', desc: 'Clean white',
                        preview: { bg: '#f0f4f8', card: '#ffffff', accent: 'rgba(8,145,178,0.4)' }
                      },
                    ].map(mode => (
                      <button key={mode.id}
                        onClick={() => { if (theme !== mode.id) toggle() }}
                        className="p-4 rounded-xl border text-left transition-all"
                        style={{
                          background: theme === mode.id ? 'rgba(8,145,178,0.10)' : 'var(--bg-hover)',
                          borderColor: theme === mode.id ? 'rgba(56,217,245,0.35)' : 'var(--border)',
                        }}>
                        <div className="rounded-lg overflow-hidden mb-3"
                          style={{
                            background: mode.preview.bg,
                            border: '1px solid rgba(128,128,128,0.15)',
                            height: 56, padding: 8,
                          }}>
                          <div style={{
                            background: mode.preview.card, borderRadius: 4,
                            height: 12, marginBottom: 5,
                          }} />
                          <div style={{
                            background: mode.preview.accent, borderRadius: 4,
                            height: 8, width: '65%',
                          }} />
                        </div>
                        <p className="text-sm font-bold" style={{
                          color: theme === mode.id ? '#38d9f5' : 'var(--text-1)'
                        }}>
                          {mode.label}
                          {theme === mode.id && (
                            <span className="ml-2 text-xs font-normal" style={{ color: '#38d9f5' }}>
                              ✓ Active
                            </span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Your preference is saved automatically and remembered across sessions.
                </p>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="font-bold" style={{ color: 'var(--text-1)' }}>Security</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Protect your Aurora account
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    {
                      title: 'Two-factor authentication',
                      desc: 'Add an extra layer of security with an authenticator app',
                      href: '/dashboard/security',
                      status: 'Manage',
                      icon: '🔐',
                    },
                    ...(!isOAuthUser ? [{
                      title: 'Password',
                      desc: 'Change your account password',
                      href: '/reset-password',
                      status: 'Change',
                      icon: '🔑',
                    }] : []),
                  ].map(item => (
                    <div key={item.title}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                            {item.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.desc}</p>
                        </div>
                      </div>
                      <a href={item.href}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-2)',
                        }}>
                        {item.status} &rarr;
                      </a>
                    </div>
                  ))}

                  {isOAuthUser && (
                    <div className="flex items-start gap-3 p-4 rounded-xl"
                      style={{
                        background: 'rgba(56,217,245,0.06)',
                        border: '1px solid rgba(56,217,245,0.15)',
                      }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>&#8505;&#65039;</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#38d9f5' }}>
                          Google Sign-In account
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                          Your Aurora account is linked to Google. Password management
                          is handled by Google &mdash; visit your Google account settings
                          to update your password or security settings.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Account info</h3>
                </div>
                <div className="p-5 space-y-2">
                  {[
                    ['Account email', profile?.email || '—'],
                    ['Member since', profile?.created_at ? fmt(profile.created_at) : '—'],
                    ['Last login', profile?.last_login_at ? fmt(profile.last_login_at) : '—'],
                  ].map(([label, value]) => (
                    <div key={label}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'compliance' && (
            <div className="space-y-4">
              <ComplianceStatus />
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Legal documents</h3>
                </div>
                <div className="p-5 space-y-2">
                  {[
                    { label: 'Terms of Service', href: '/terms' },
                    { label: 'Risk Warning', href: '/risk-warning' },
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Cookie Policy', href: '/cookies' },
                  ].map(doc => (
                    <a key={doc.href} href={doc.href} target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                      }}>
                      <span className="text-sm" style={{ color: 'var(--text-1)' }}>{doc.label}</span>
                      <span className="text-xs" style={{ color: '#38d9f5' }}>View →</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
