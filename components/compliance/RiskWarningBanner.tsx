'use client'
import { useState } from 'react'

export default function RiskWarningBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('risk_banner_dismissed') === 'true'
  })

  if (dismissed) return null

  return (
    <div className="w-full px-4 py-2.5 flex items-center justify-between gap-4"
      style={{ background: '#1a0a00', borderBottom: '1px solid rgba(251,146,60,0.3)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-amber-400 text-sm flex-shrink-0">{'\u26A0'}</span>
        <p className="text-amber-400/90 text-xs leading-tight">
          <strong className="font-bold">Capital at risk.</strong>
          {' '}The value of investments can go down as well as up. You may get back less than you invest.
          Aurora Growth Academy provides educational tools only and does not constitute financial advice.
          Past performance is not a reliable indicator of future results.
        </p>
      </div>
      <button
        onClick={() => {
          sessionStorage.setItem('risk_banner_dismissed', 'true')
          setDismissed(true)
        }}
        className="text-amber-400/40 hover:text-amber-400/80 text-xs
        flex-shrink-0 transition-colors underline"
      >
        Dismiss
      </button>
    </div>
  )
}
