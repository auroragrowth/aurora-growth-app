'use client'
import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookies_accepted')
    if (!accepted) setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookies_accepted', 'true')
    setShow(false)
  }

  const decline = () => {
    localStorage.setItem('cookies_accepted', 'essential_only')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm
      z-[150] rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.12)' }}>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u{1F36A}'}</span>
          <p className="text-white font-bold text-sm">Cookie notice</p>
        </div>
        <p className="text-white/50 text-xs leading-relaxed">
          We use essential cookies to keep you signed in and remember your preferences.
          We do not use advertising or tracking cookies.{' '}
          <a href="/cookies" className="text-cyan-400 underline">Learn more</a>
        </p>
        <div className="flex gap-2">
          <button onClick={decline}
            className="flex-1 py-2 rounded-xl border border-white/10
            text-white/40 text-xs font-bold hover:bg-white/5 transition-all">
            Essential only
          </button>
          <button onClick={accept}
            className="flex-1 py-2 rounded-xl font-bold text-xs
            bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90">
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
