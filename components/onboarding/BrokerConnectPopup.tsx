'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BrokerConnectPopup() {
  const [visible, setVisible] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [step, setStep] = useState(1)

  useEffect(() => {
    // Check localStorage FIRST - instant
    if (typeof window !== 'undefined') {
      if (
        localStorage.getItem('broker_popup_skip') === 'true' ||
        localStorage.getItem('aurora_all_popups_done') === 'true'
      ) return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('profiles')
        .select('has_seen_trading212_prompt, trading212_connected, has_completed_plan_selection')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (
            data?.has_completed_plan_selection &&
            !data?.trading212_connected &&
            !data?.has_seen_trading212_prompt
          ) {
            setVisible(true)
          }
        })
    })
  }, [])

  const dismiss = async () => {
    // Close FIRST - immediate
    setVisible(false)
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('broker_popup_skip', 'true')
    }
    // Save to database
    if (userId) {
      const supabase = createClient()
      await supabase.from('profiles').update({
        has_seen_trading212_prompt: true,
        welcome_popup_shown_count: 10
      }).eq('id', userId)
    }
  }

  const goConnect = () => {
    dismiss()
    window.location.href = '/dashboard/connections'
  }

  if (!visible) return null

  const steps = [
    { number: 1, icon: '🌐', title: 'Open broker on desktop', desc: 'Log in to your broker account on a desktop browser — not the mobile app.' },
    { number: 2, icon: '⚙️', title: 'Go to Settings → API', desc: 'Click your profile icon top right, then Settings. Find the API section in the left menu.' },
    { number: 3, icon: '🔓', title: 'Enable API access', desc: 'Switch the "Enable API access" toggle ON. Do this for Live and Practice accounts separately.' },
    { number: 4, icon: '🔑', title: 'Generate your key', desc: 'Click Generate under the account type you want. Copy the key — it only shows once.' },
    { number: 5, icon: '✅', title: 'Test your key', desc: 'In terminal: curl -s -H "Authorization: YOUR_KEY" https://live.trading212.com/api/v0/equity/account/info — you should see your account JSON.' },
    { number: 6, icon: '🚀', title: 'Connect in Aurora', desc: 'Go to Connections in Aurora, enter your key, select Live or Practice mode, and click Connect.' },
  ]

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: '#080f1e',
          border: '1px solid rgba(87,211,243,0.2)',
          boxShadow: '0 0 60px rgba(87,211,243,0.08)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">🔗 Connect Your Broker</h2>
            <p className="text-white/40 text-sm mt-0.5">
              Step-by-step guide to connect your account
            </p>
          </div>
          {/* X BUTTON - large and obvious */}
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
            text-white/60 hover:text-white text-xl flex items-center
            justify-center transition-all flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
          {steps.map((s) => (
            <button
              key={s.number}
              onClick={() => setStep(s.number)}
              className={`transition-all rounded-full ${
                s.number === step
                  ? 'w-6 h-2.5 bg-cyan-400'
                  : s.number < step
                  ? 'w-2.5 h-2.5 bg-cyan-400/40'
                  : 'w-2.5 h-2.5 bg-white/10'
              }`}
            />
          ))}
          <span className="text-white/30 text-xs ml-1">{step}/{steps.length}</span>
        </div>

        {/* Step content */}
        {steps.filter(s => s.number === step).map(s => (
          <div key={s.number} className="px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20
                flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Step {s.number} of {steps.length}
                </p>
                <h3 className="text-white font-bold text-base mb-2">{s.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>

            {s.number === 4 && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-red-400/80 text-xs">
                  ⚠️ The API key only shows once — copy it immediately. Never share it in chat.
                </p>
              </div>
            )}
            {s.number === 1 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-amber-400/80 text-xs">
                  💡 No account yet? Visit Connections to sign up and get a free share on first deposit.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {/* Skip - clear and prominent */}
          <button
            onClick={dismiss}
            className="text-white/30 text-sm hover:text-white/60 transition-colors underline underline-offset-2"
          >
            Skip for now
          </button>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-xl border border-white/10
                text-white/50 text-sm hover:bg-white/5 transition-colors"
              >
                ← Back
              </button>
            )}
            {step < steps.length ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-blue-500 text-white
                hover:opacity-90 transition-opacity"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={goConnect}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-purple-500 text-white
                hover:opacity-90 transition-opacity"
              >
                Go to Connections →
              </button>
            )}
          </div>
        </div>

        <div className="text-center pb-4">
          <p className="text-white/20 text-xs">
            Connect anytime from the Connections page
          </p>
        </div>
      </div>
    </div>
  )
}
