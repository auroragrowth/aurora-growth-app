'use client'
import { useState, useEffect } from 'react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  plan_key: string | null
  plan: string | null
  subscription_status: string | null
  compliance_accepted: boolean
  compliance_accepted_at: string | null
  compliance_version: string | null
  created_at: string | null
}

interface AcceptanceRecord {
  id: string
  user_id: string
  email: string
  full_name: string | null
  accepted_at: string
  ip_address: string
  terms_version: string
  risk_warning_version: string
  privacy_version: string
  acceptance_method: string
  email_sent: boolean
  email_sent_at: string | null
}

export default function AdminCompliancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [records, setRecords] = useState<AcceptanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'overview' | 'records'>('overview')

  useEffect(() => {
    const load = async () => {
      try {
        const [profilesRes, recordsRes] = await Promise.all([
          fetch('/api/admin/compliance/profiles'),
          fetch('/api/admin/compliance'),
        ])
        if (profilesRes.ok) setProfiles(await profilesRes.json())
        if (recordsRes.ok) setRecords(await recordsRes.json())
        if (!profilesRes.ok && !recordsRes.ok) setError('Access denied or failed to load')
      } catch {
        setError('Failed to load compliance data')
      }
      setLoading(false)
    }
    load()
  }, [])

  const accepted = profiles.filter(p => p.compliance_accepted)
  const pending = profiles.filter(p => !p.compliance_accepted)

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014'
    return new Date(d).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const getPlan = (p: Profile) => {
    const plan = p.plan_key || p.plan || 'core'
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }

  return (
    <div className="px-4 py-8 mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance Management</h1>
        <p className="text-white/40 text-sm mt-1">
          Terms, risk warning &amp; privacy policy acceptance records for all users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: profiles.length, colour: 'text-white' },
          { label: 'Accepted', value: accepted.length, colour: 'text-green-400' },
          { label: 'Pending', value: pending.length, colour: 'text-amber-400' },
          { label: 'Acceptance Rate', value: profiles.length ? `${Math.round((accepted.length / profiles.length) * 100)}%` : '\u2014', colour: 'text-cyan-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/30 text-xs uppercase tracking-wider font-bold">{stat.label}</p>
            <p className={`text-2xl font-bold mt-2 ${stat.colour}`}>{loading ? '\u2026' : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'overview' as const, label: 'All Profiles' },
          { key: 'records' as const, label: `Acceptance Records (${records.length})` },
        ].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400'
                : 'bg-white/5 border border-white/8 text-white/40 hover:bg-white/8'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : tab === 'overview' ? (
        /* All Profiles Tab */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_100px_100px_140px] gap-4 px-5 py-3 border-b border-white/8">
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">User</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Email</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Plan</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Status</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Accepted</p>
          </div>

          {/* Pending first, then accepted */}
          {[...pending, ...accepted].map(profile => (
            <div key={profile.id}
              className={`grid grid-cols-[1fr_1fr_100px_100px_140px] gap-4 px-5 py-3 border-b border-white/5
              ${profile.compliance_accepted ? '' : 'bg-amber-400/3'}`}>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {profile.full_name || 'No name'}
                </p>
              </div>
              <p className="text-white/50 text-sm truncate">{profile.email}</p>
              <p className="text-white/50 text-sm">{getPlan(profile)}</p>
              <div>
                {profile.compliance_accepted ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold
                    bg-green-500/15 border border-green-500/25 text-green-400">
                    {'\u2713'} Done
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold
                    bg-amber-400/15 border border-amber-400/25 text-amber-400">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-white/40 text-xs">
                {formatDate(profile.compliance_accepted_at)}
              </p>
            </div>
          ))}

          {profiles.length === 0 && (
            <div className="p-8 text-center text-white/30 text-sm">No profiles found</div>
          )}
        </div>
      ) : (
        /* Acceptance Records Tab */
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_140px_80px_80px] gap-4 px-5 py-3 border-b border-white/8">
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Name</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Email</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Accepted At</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Version</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Email</p>
          </div>

          {records.map(record => (
            <div key={record.id}
              className="grid grid-cols-[1fr_1fr_140px_80px_80px] gap-4 px-5 py-3 border-b border-white/5">
              <p className="text-white text-sm truncate">{record.full_name || 'Not provided'}</p>
              <p className="text-white/50 text-sm truncate">{record.email}</p>
              <p className="text-white/50 text-xs">{formatDate(record.accepted_at)}</p>
              <p className="text-white/40 text-xs font-mono">{record.terms_version.replace('v1.0-', '')}</p>
              <div>
                {record.email_sent ? (
                  <span className="text-green-400 text-xs">{'\u2713'} Sent</span>
                ) : (
                  <span className="text-amber-400 text-xs">Not sent</span>
                )}
              </div>
            </div>
          ))}

          {records.length === 0 && (
            <div className="p-8 text-center text-white/30 text-sm">No acceptance records yet</div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-xl"
        style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(87,211,243,0.1)' }}>
        <p className="text-white/40 text-xs leading-relaxed">
          All users who have not accepted the terms will see the compliance acceptance modal
          on every login until they complete it. Acceptance records include timestamp, IP address,
          user agent, and document versions. A confirmation email is sent to each user on acceptance.
        </p>
      </div>
    </div>
  )
}
