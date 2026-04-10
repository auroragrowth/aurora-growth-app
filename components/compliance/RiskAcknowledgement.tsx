'use client'
import { useState } from 'react'

interface Props {
  onAccepted: (accepted: boolean) => void
}

export default function RiskAcknowledgement({ onAccepted }: Props) {
  const [ticked, setTicked] = useState(false)

  const toggle = () => {
    const next = !ticked
    setTicked(next)
    onAccepted(next)
  }

  return (
    <div className="space-y-3">
      <button onClick={toggle}
        className={`w-full flex items-start gap-3 p-4 rounded-xl border
        text-left transition-all ${
          ticked
            ? 'bg-amber-400/8 border-amber-400/25'
            : 'bg-white/3 border-white/10 hover:bg-white/5'
        }`}>
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
          flex-shrink-0 mt-0.5 transition-all ${
          ticked
            ? 'border-amber-400 bg-amber-400'
            : 'border-white/20'
        }`}>
          {ticked && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          I understand that Aurora Growth Academy provides <strong className="text-white/80">educational tools only</strong> and
          does not constitute financial advice. I accept that investments can fall in value and
          I could lose some or all of my money. I have read the{' '}
          <a href="/risk-warning" target="_blank"
            onClick={e => e.stopPropagation()}
            className="text-amber-400 underline hover:text-amber-300">
            full risk warning
          </a>
          {' '}and{' '}
          <a href="/terms" target="_blank"
            onClick={e => e.stopPropagation()}
            className="text-amber-400 underline hover:text-amber-300">
            terms of service
          </a>.
        </p>
      </button>
    </div>
  )
}
