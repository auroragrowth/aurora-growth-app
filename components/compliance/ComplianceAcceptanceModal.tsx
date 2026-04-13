'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ComplianceAcceptanceModal() {
  const [visible, setVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [checks, setChecks] = useState({
    terms: false,
    risk: false,
    privacy: false,
    age: false,
    understand: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [acceptedAt, setAcceptedAt] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('compliance_accepted, compliance_accepted_at, full_name, first_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!data?.compliance_accepted) {
            setFullName(data?.full_name || data?.first_name || '')
            setVisible(true)
          }
        })
    })
  }, [])

  const allChecked = Object.values(checks).every(Boolean)

  const handleAccept = async () => {
    if (!allChecked) { setError('Please tick all boxes to continue'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/compliance/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setAcceptedAt(new Date(data.accepted_at).toLocaleString('en-GB', {
          timeZone: 'Europe/London',
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }))
        setDone(true)
      } else {
        setError(data.error || 'Something went wrong \u2014 please try again')
      }
    } catch {
      setError('Connection error \u2014 please try again')
    }
    setSaving(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden mx-4"
        style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30
              flex items-center justify-center text-2xl mx-auto">{'\u2713'}</div>
            <p className="text-green-400 font-bold text-lg">Agreement recorded</p>
            <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-left space-y-1.5">
              <p className="text-white/60 text-xs">Date: <strong className="text-white">{acceptedAt}</strong></p>
              <p className="text-white/60 text-xs">Documents: Terms &middot; Risk Warning &middot; Privacy Policy</p>
              <p className="text-white/30 text-[10px] mt-1">
                A confirmation email has been sent to you.
              </p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="w-full py-2.5 rounded-xl font-bold text-sm
              bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90">
              Enter Aurora Growth Academy &rarr;
            </button>
          </div>
        ) : (
          <>
            {/* Compact header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/8"
              style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.1) 0%, rgba(139,92,246,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <img src="/aurora-logo.png" alt="Aurora" className="h-8 w-auto" />
                <div>
                  <h2 className="text-white font-bold text-base">Aurora Growth Academy</h2>
                  <p className="text-white/40 text-xs">Please review and accept our terms to continue</p>
                </div>
              </div>
              <p className="text-amber-400/80 text-xs leading-snug p-2 rounded-lg bg-amber-400/8 border border-amber-400/15">
                {'\u26A0'} Capital at risk. Don&apos;t invest unless you&apos;re prepared to lose all the money you invest.
              </p>
            </div>

            <div className="p-5 space-y-4">

              {/* Name input */}
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1.5 font-bold">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg
                  px-3 py-2 text-white text-sm
                  focus:outline-none focus:border-cyan-400/50
                  placeholder:text-white/20"
                />
              </div>

              {/* Checkboxes - compact */}
              <div className="space-y-2">
                {[
                  {
                    key: 'terms',
                    text: 'I accept the',
                    link: { label: 'Terms of Service', href: '/terms' },
                  },
                  {
                    key: 'risk',
                    text: 'I have read the',
                    link: { label: 'Risk Warning', href: '/risk-warning' },
                    suffix: 'and accept my capital is at risk.'
                  },
                  {
                    key: 'privacy',
                    text: 'I accept the',
                    link: { label: 'Privacy Policy', href: '/privacy' },
                  },
                  {
                    key: 'age',
                    text: 'I am at least 18 years old.',
                    link: null,
                  },
                  {
                    key: 'understand',
                    text: 'I understand this is educational only \u2014 not financial advice.',
                    link: null,
                  },
                ].map(item => {
                  const key = item.key as keyof typeof checks
                  return (
                    <button
                      key={key}
                      onClick={() => setChecks(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border
                      text-left transition-all ${
                        checks[key]
                          ? 'bg-green-500/8 border-green-500/20'
                          : 'bg-white/3 border-white/8 hover:bg-white/5'
                      }`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center
                        flex-shrink-0 mt-0.5 transition-all ${
                        checks[key]
                          ? 'border-green-400 bg-green-400'
                          : 'border-white/20'
                      }`}>
                        {checks[key] && <span className="text-white text-[10px] font-bold">{'\u2713'}</span>}
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">
                        {item.text}{' '}
                        {item.link && (
                          <a
                            href={item.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-cyan-400 underline hover:text-cyan-300">
                            {item.link.label}
                          </a>
                        )}
                        {item.suffix ? ` ${item.suffix}` : ''}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Timestamp notice */}
              <p className="text-white/20 text-[10px] leading-relaxed">
                {'\u{1F512}'} Your acceptance is recorded with timestamp and IP address.
              </p>

              {error && (
                <p className="text-red-400 text-xs">{'\u2717'} {error}</p>
              )}

              <button
                onClick={handleAccept}
                disabled={saving || !allChecked}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                  allChecked
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90'
                    : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                } disabled:opacity-60`}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Recording...
                  </span>
                ) : allChecked ? (
                  'I accept \u2014 continue \u2192'
                ) : (
                  'Tick all boxes to continue'
                )}
              </button>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
