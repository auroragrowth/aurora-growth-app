'use client'
import { useState } from 'react'

interface Props {
  score: number
  showLabel?: boolean
}

function getScoreBand(score: number) {
  if (score >= 28) return {
    label: 'Exceptional', colour: '#34d399', bg: 'rgba(52,211,153,0.12)',
    description: 'Maximum qualifying rises with strong fundamentals. Highest conviction Aurora stock.',
  }
  if (score >= 24) return {
    label: 'Strong', colour: '#38d9f5', bg: 'rgba(56,217,245,0.10)',
    description: 'Multiple qualifying rises and strong fundamentals. High quality Aurora candidate.',
  }
  if (score >= 20) return {
    label: 'Good', colour: '#a78bfa', bg: 'rgba(167,139,250,0.10)',
    description: 'Good track record of qualifying rises. Solid Aurora candidate worth watching.',
  }
  if (score >= 14) return {
    label: 'Moderate', colour: '#fbbf24', bg: 'rgba(251,191,36,0.10)',
    description: 'Some qualifying rises detected. Watch for further development.',
  }
  return {
    label: 'Early', colour: '#94a3b8', bg: 'rgba(148,163,184,0.08)',
    description: 'Limited qualifying rise history. May develop into an Aurora candidate over time.',
  }
}

export default function AuroraScoreTooltip({ score, showLabel = false }: Props) {
  const [open, setOpen] = useState(false)
  const band = getScoreBand(score)

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all cursor-help"
        style={{ background: band.bg, border: `1px solid ${band.colour}30` }}>
        <span className="font-bold font-mono text-sm" style={{ color: band.colour }}>
          {score}
        </span>
        {showLabel && (
          <span className="text-xs font-bold" style={{ color: band.colour }}>
            {band.label}
          </span>
        )}
        <span style={{ color: band.colour, fontSize: 10, opacity: 0.7 }}>&#8505;</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 rounded-xl p-3 shadow-xl"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${band.colour}30`,
            minWidth: 260,
            maxWidth: 300,
          }}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-3)' }}>Aurora Score</p>
            <span className="font-bold text-base font-mono"
              style={{ color: band.colour }}>{score} &mdash; {band.label}</span>
          </div>

          <div className="h-1.5 rounded-full mb-3 overflow-hidden"
            style={{ background: 'var(--bg-hover)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (score / 35) * 100)}%`,
                background: `linear-gradient(90deg, ${band.colour}80, ${band.colour})`,
              }} />
          </div>

          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
            {band.description}
          </p>

          <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-3)' }}>How it&apos;s calculated</p>
            {[
              { factor: 'Qualifying rises', desc: '20%+ gains in last 12 months', weight: 'Primary' },
              { factor: 'Rise consistency', desc: 'Pattern reliability over time', weight: 'Secondary' },
              { factor: 'Fundamentals', desc: 'Financial health & quality metrics', weight: 'Secondary' },
            ].map(f => (
              <div key={f.factor} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{f.factor}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{f.desc}</p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px',
                  borderRadius: 4, whiteSpace: 'nowrap',
                  background: f.weight === 'Primary' ? 'rgba(56,217,245,0.12)' : 'var(--bg-hover)',
                  color: f.weight === 'Primary' ? '#38d9f5' : 'var(--text-3)',
                }}>{f.weight}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-3)' }}>Score thresholds</p>
            {[
              { range: '28 \u2013 35', label: 'Exceptional', colour: '#34d399' },
              { range: '24 \u2013 27', label: 'Strong',      colour: '#38d9f5' },
              { range: '20 \u2013 23', label: 'Good',        colour: '#a78bfa' },
              { range: '14 \u2013 19', label: 'Moderate',    colour: '#fbbf24' },
              { range: '0 \u2013 13',  label: 'Early',       colour: '#94a3b8' },
            ].map(t => (
              <div key={t.range} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: t.colour, display: 'inline-block', flexShrink: 0,
                  }} />
                  <span className="text-xs font-bold" style={{ color: t.colour }}>{t.label}</span>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>{t.range}</span>
              </div>
            ))}
          </div>

          <div style={{
            position: 'absolute', bottom: -5, left: 16,
            width: 10, height: 10,
            background: 'var(--bg-card)',
            border: `1px solid ${band.colour}30`,
            transform: 'rotate(45deg)',
            borderTop: 'none', borderLeft: 'none',
          }} />
        </div>
      )}
    </div>
  )
}
