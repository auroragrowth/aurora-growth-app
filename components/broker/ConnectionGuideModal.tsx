'use client'
import { useState } from 'react'

const steps = [
  {
    num: 1,
    title: 'Log in to Trading 212 on desktop',
    desc: 'Go to trading212.com and log in to your account. The API settings are not available in the mobile app — you need to use a desktop or laptop browser.',
  },
  {
    num: 2,
    title: 'Open your account settings',
    desc: 'Click your profile icon or initials in the top-right corner of the platform. From the menu that appears, click Settings.',
  },
  {
    num: 3,
    title: 'Find the API section',
    desc: 'In the settings panel on the left-hand side, scroll down and click API.',
  },
  {
    num: 4,
    title: 'Enable API access',
    desc: 'You will see a toggle labelled "Enable API access". Switch it ON. If you want to connect both your Live and Practice accounts, you need to repeat this for each one — Trading 212 keeps them completely separate.',
  },
  {
    num: 5,
    title: 'Generate your key',
    desc: 'Once API access is enabled, a Generate button will appear. Click it. Your API key will be shown on screen — copy it immediately. It will only be shown once and cannot be retrieved again.',
  },
  {
    num: 6,
    title: 'Paste your key into Aurora',
    desc: 'Come back to this Connections page, select whether you are connecting your Live or Practice account, paste your key, and click Connect. Aurora will test the connection automatically.',
  },
]

export function ConnectionGuideButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10"
      >
        <span className="text-base">📖</span>
        How to Connect Trading 212
      </button>

      {open && <ConnectionGuideModal onClose={() => setOpen(false)} />}
    </>
  )
}

export default function ConnectionGuideModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const current = steps[step - 1]

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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
            <h2 className="text-white font-bold text-lg">How to Connect Trading 212</h2>
            <p className="text-white/40 text-sm mt-0.5">Step-by-step guide &mdash; takes about two minutes</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
            text-white/60 hover:text-white text-xl flex items-center
            justify-center transition-all flex-shrink-0"
          >
            &times;
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`transition-all rounded-full ${
                s.num === step
                  ? 'w-6 h-2.5 bg-cyan-400'
                  : s.num < step
                  ? 'w-2.5 h-2.5 bg-cyan-400/40'
                  : 'w-2.5 h-2.5 bg-white/10'
              }`}
            />
          ))}
          <span className="text-white/30 text-xs ml-1">{step}/{steps.length}</span>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20
              border border-cyan-400/20 flex items-center justify-center text-xl
              font-bold text-cyan-400 flex-shrink-0">
              {current.num}
            </div>
            <div>
              <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
                Step {current.num} of {steps.length}
              </p>
              <h3 className="text-white font-bold text-base mb-2">{current.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{current.desc}</p>
            </div>
          </div>

          {step === 4 && (
            <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-cyan-400/80 text-xs">
                Switch between Live and Practice using the account selector at the top of the Trading 212 platform.
              </p>
            </div>
          )}
          {step === 5 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-amber-400/80 text-xs">
                The key only shows once and cannot be retrieved again. If you lose it, you can always generate a new one from the same page.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          <div className="text-white/20 text-xs">
            {step === steps.length ? 'You\'re ready to connect!' : ''}
          </div>
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
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-bold
                bg-gradient-to-r from-cyan-400 to-purple-500 text-white
                hover:opacity-90 transition-opacity"
              >
                Got it &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Extra info */}
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Connecting both accounts</p>
              <p className="text-white/40 text-xs leading-relaxed">
                Generate a separate key for each account type (Live and Practice) in Trading 212 and connect them both here. Then use the Live/Demo toggle in the Aurora top bar to switch between them.
              </p>
            </div>
            <div className="h-px bg-white/5" />
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">No Trading 212 account?</p>
              <p className="text-white/40 text-xs leading-relaxed">
                Open one at <a href="https://trading212.com" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">trading212.com</a> &mdash; use the Aurora referral link below and get a free share on your first deposit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
