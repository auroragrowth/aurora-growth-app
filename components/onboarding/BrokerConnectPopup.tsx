'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BrokerConnectPopup() {
  const [visible, setVisible] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [step, setStep] = useState(1)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
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
    setDismissed(true)
    setVisible(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('broker_popup_skip', 'true')
    }
    if (userId) {
      Promise.resolve(
        createClient()
          .from('profiles')
          .update({
            has_seen_trading212_prompt: true,
            welcome_popup_shown_count: 10
          })
          .eq('id', userId)
      ).catch(() => {})
    }
  }

  const goConnect = () => {
    dismiss()
    setTimeout(() => {
      window.location.href = '/dashboard/connections'
    }, 100)
  }

  if (dismissed || !visible) return null

  const steps = [
    {
      number: 1,
      title: 'Log in to Trading 212 on desktop',
      desc: 'Go to trading212.com and log in to your account. The API settings are not available in the mobile app — you need to use a desktop or laptop browser.',
      note: null,
      noteType: null as 'warning' | 'info' | null,
    },
    {
      number: 2,
      title: 'Open your account settings',
      desc: 'Click your profile icon or initials in the top-right corner of the platform. From the menu that appears, click Settings.',
      note: null,
      noteType: null as 'warning' | 'info' | null,
    },
    {
      number: 3,
      title: 'Find the API section',
      desc: 'In the settings panel on the left-hand side, scroll down and click API.',
      note: null,
      noteType: null as 'warning' | 'info' | null,
    },
    {
      number: 4,
      title: 'Enable API access',
      desc: 'You will see a toggle labelled "Enable API access". Switch it ON. If you want to connect both your Live and Practice accounts, you need to repeat this step for each one — Trading 212 keeps them completely separate.',
      note: 'Switch between Live and Practice using the account selector at the top of the Trading 212 platform.',
      noteType: 'info' as 'warning' | 'info' | null,
    },
    {
      number: 5,
      title: 'Generate your key',
      desc: 'Once API access is enabled, a Generate button will appear. Click it. Your API key will be shown on screen — copy it immediately.',
      note: 'The key only shows once and cannot be retrieved again. If you lose it, you can always generate a new one.',
      noteType: 'warning' as 'warning' | 'info' | null,
    },
    {
      number: 6,
      title: 'Paste your key into Aurora',
      desc: 'Go to your Aurora dashboard and open the Connections page. Select whether you are connecting your Live or Practice account, paste your key, and click Connect. Aurora will test the connection automatically.',
      note: null,
      noteType: null as 'warning' | 'info' | null,
    },
  ]

  const current = steps[step - 1]

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
            <h2 className="text-white font-bold text-lg">Connect Your Trading 212 Account</h2>
            <p className="text-white/40 text-sm mt-0.5">
              Takes about two minutes
            </p>
          </div>
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
            text-white/60 hover:text-white text-xl flex items-center
            justify-center transition-all flex-shrink-0"
            aria-label="Close"
          >
            &times;
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
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20
              border border-cyan-400/20 flex items-center justify-center text-xl
              font-bold text-cyan-400 flex-shrink-0">
              {current.number}
            </div>
            <div>
              <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
                Step {current.number} of {steps.length}
              </p>
              <h3 className="text-white font-bold text-base mb-2">{current.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{current.desc}</p>
            </div>
          </div>

          {current.note && (
            <div className={`mt-4 p-3 rounded-xl ${
              current.noteType === 'warning'
                ? 'bg-amber-500/5 border border-amber-500/20'
                : 'bg-cyan-500/5 border border-cyan-500/20'
            }`}>
              <p className={`text-xs ${
                current.noteType === 'warning' ? 'text-amber-400/80' : 'text-cyan-400/80'
              }`}>
                {current.note}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <p className="text-purple-400/80 text-xs">
                No Trading 212 account yet? Visit the Connections page for a referral link &mdash; get a free share on your first deposit.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              dismiss()
              setTimeout(() => { window.location.href = '/dashboard' }, 100)
            }}
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
                &larr; Back
              </button>
            )}
            {step < steps.length ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-blue-500 text-white
                hover:opacity-90 transition-opacity"
              >
                Next &rarr;
              </button>
            ) : (
              <button
                onClick={goConnect}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-purple-500 text-white
                hover:opacity-90 transition-opacity"
              >
                Go to Connections &rarr;
              </button>
            )}
          </div>
        </div>

        <div className="text-center pb-4">
          <p className="text-white/20 text-xs">
            You can connect anytime from the Connections page
          </p>
        </div>
      </div>
    </div>
  )
}
