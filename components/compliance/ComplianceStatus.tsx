'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AcceptanceRecord {
  id: string
  accepted_at: string
  full_name: string
  terms_version: string
  risk_warning_version: string
  privacy_version: string
  ip_address: string
  email_sent: boolean
}

export default function ComplianceStatus() {
  const [records, setRecords] = useState<AcceptanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/compliance/records')
      if (res.ok) {
        const data = await res.json()
        setRecords(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const latest = records[0]

  return (
    <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.32)] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Terms &amp; Compliance</h3>
          <p className="text-white/30 text-xs mt-0.5">Your agreement records</p>
        </div>
        {latest && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold
            bg-green-500/15 border border-green-500/25 text-green-400">
            {'\u2713'} Accepted
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ) : !latest ? (
          <div className="p-4 rounded-xl bg-amber-400/8 border border-amber-400/20 text-center">
            <p className="text-amber-400 text-sm font-bold">No acceptance record found</p>
            <p className="text-white/40 text-xs mt-1">
              Please log out and log back in to complete the acceptance process
            </p>
          </div>
        ) : (
          <>
            {/* Latest acceptance */}
            <div className="p-4 rounded-xl bg-green-500/8 border border-green-500/20 space-y-3">
              <p className="text-green-400 font-bold text-sm">{'\u2713'} Terms accepted</p>
              <div className="space-y-1.5">
                {[
                  ['Date & time', new Date(latest.accepted_at).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  }) + ' (London)'],
                  ['Name on record', latest.full_name || 'Not provided'],
                  ['Terms version', latest.terms_version],
                  ['Risk warning', latest.risk_warning_version],
                  ['Privacy policy', latest.privacy_version],
                  ['Email confirmation', latest.email_sent ? '\u2713 Sent' : 'Not sent'],
                  ['Record ID', latest.id.slice(0, 8) + '...'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-white/30">{label}</span>
                    <span className="text-white/70 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents accepted */}
            <div>
              <p className="text-white/30 text-xs uppercase tracking-wider font-bold mb-2">
                Documents agreed
              </p>
              <div className="space-y-1.5">
                {[
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Risk Warning', href: '/risk-warning' },
                  { label: 'Privacy Policy', href: '/privacy' },
                ].map(doc => (
                  <a key={doc.href} href={doc.href} target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl
                    bg-white/3 border border-white/8 hover:bg-white/5 transition-all">
                    <span className="text-white/60 text-xs">{'\u2713'} {doc.label}</span>
                    <span className="text-cyan-400/50 text-xs">View &rarr;</span>
                  </a>
                ))}
              </div>
            </div>

            {records.length > 1 && (
              <p className="text-white/20 text-xs text-center">
                {records.length} acceptance records on file
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
