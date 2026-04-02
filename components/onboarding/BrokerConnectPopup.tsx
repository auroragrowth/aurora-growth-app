'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BrokerConnectPopup() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    // Check localStorage first
    if (localStorage.getItem('broker_popup_skip') === 'true') return
    if (localStorage.getItem('aurora_all_popups_done') === 'true') return

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

  const handleSkip = async () => {
    localStorage.setItem('broker_popup_skip', 'true')
    setVisible(false)
    if (userId) {
      const supabase = createClient()
      await supabase.from('profiles').update({
        has_seen_trading212_prompt: true,
        welcome_popup_shown_count: 10
      }).eq('id', userId)
    }
  }

  const handleConnect = () => {
    window.location.href = '/dashboard/connections'
  }

  if (!visible) return null

  const steps = [
    {
      number: 1,
      title: 'Open your broker account',
      description: 'Log in to your broker account on desktop browser. If you don\'t have one yet, sign up using the link on the Connections page to get a free share worth up to \u00a3100.',
      icon: '\uD83C\uDF10'
    },
    {
      number: 2,
      title: 'Go to Settings \u2192 API',
      description: 'Click your profile icon in the top right corner, then go to Settings. Scroll down to find the API section in the left menu.',
      icon: '\u2699\uFE0F'
    },
    {
      number: 3,
      title: 'Enable API access',
      description: 'You will see a toggle labelled "Enable API access". Switch this ON. You may need to do this separately for your Live account and Practice account.',
      icon: '\uD83D\uDD13'
    },
    {
      number: 4,
      title: 'Generate your API key',
      description: 'Click "Generate" under the account type you want to connect (Live or Practice). Copy the key shown \u2014 it only appears once so copy it immediately.',
      icon: '\uD83D\uDD11'
    },
    {
      number: 5,
      title: 'Test your key',
      description: 'In your terminal or command line, run: curl -s -H "Authorization: YOUR_KEY" https://live.trading212.com/api/v0/equity/account/info \u2014 you should see your account details in JSON format.',
      icon: '\u2705'
    },
    {
      number: 6,
      title: 'Connect in Aurora',
      description: 'Go to the Connections page in Aurora, enter your API key, select Live or Practice mode, and click Connect. Aurora will verify the key and connect your portfolio instantly.',
      icon: '\uD83D\uDE80'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg bg-[#080f1e] rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(87,211,243,0.2)', boxShadow: '0 0 60px rgba(87,211,243,0.08)' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-lg">{'\uD83D\uDD17'}</span>
              <h2 className="text-white font-bold text-lg">Connect Your Broker</h2>
            </div>
            <button onClick={handleSkip}
              className="text-white/30 hover:text-white/60 text-xl transition-colors">
              &times;
            </button>
          </div>
          <p className="text-white/50 text-sm">
            Connect your broker account to unlock live portfolio tracking and trade execution
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(s.number)}
              className={`transition-all rounded-full ${
                s.number === step
                  ? 'w-6 h-2.5 bg-cyan-400'
                  : s.number < step
                  ? 'w-2.5 h-2.5 bg-cyan-400/40'
                  : 'w-2.5 h-2.5 bg-white/10'
              }`} />
          ))}
          <span className="text-white/30 text-xs ml-2">
            {step} of {steps.length}
          </span>
        </div>

        {/* Step content */}
        {steps.filter(s => s.number === step).map(s => (
          <div key={s.number} className="px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20
                flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    Step {s.number}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-2">
                  {s.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {s.description}
                </p>
              </div>
            </div>

            {/* Step-specific extras */}
            {s.number === 5 && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs mb-1 font-mono">Terminal command:</p>
                <p className="text-cyan-300 text-xs font-mono break-all">
                  curl -s -H &quot;Authorization: YOUR_KEY&quot; https://live.trading212.com/api/v0/equity/account/info
                </p>
              </div>
            )}

            {s.number === 1 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-amber-400/80 text-xs">
                  {'\uD83D\uDCA1'} Don&apos;t have an account yet? Visit the Connections page to sign up
                  and receive a free share on your first deposit.
                </p>
              </div>
            )}

            {s.number === 4 && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-red-400/80 text-xs">
                  {'\u26A0\uFE0F'} The API key only shows once. Copy it immediately and store it safely.
                  Do not share it with anyone or paste it in chat.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button onClick={handleSkip}
            className="text-white/30 text-sm hover:text-white/50 transition-colors">
            Skip for now
          </button>

          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-xl border border-white/10
                text-white/60 text-sm hover:bg-white/5 transition-colors">
                &larr; Back
              </button>
            )}
            {step < steps.length ? (
              <button onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-blue-500 text-white
                hover:opacity-90 transition-opacity">
                Next &rarr;
              </button>
            ) : (
              <button onClick={handleConnect}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-purple-500 text-white
                hover:opacity-90 transition-opacity">
                Go to Connections &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 text-center">
          <p className="text-white/20 text-xs">
            You can connect anytime from the Connections page in your dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
