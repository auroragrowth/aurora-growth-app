'use client'

export default function PreLoginRiskWarning({
  onAccept
}: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(251,146,60,0.4)' }}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-amber-400/20"
          style={{ background: 'rgba(251,146,60,0.08)' }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{'\u26A0\uFE0F'}</span>
            <p className="text-amber-400 font-bold text-lg">
              Important Risk Warning
            </p>
          </div>
          <p className="text-white font-bold text-xl leading-tight">
            Don&apos;t invest unless you&apos;re prepared to lose all the money you invest.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-white/70 text-sm leading-relaxed">
            This is a high-risk investment service. Investments in stocks and shares
            can go down as well as up in value, and you could lose some or all of
            the money you invest. You should not invest money you cannot afford to lose.
          </p>

          <div className="space-y-2.5">
            {[
              'Aurora Growth Academy provides educational tools and information only \u2014 not personalised financial advice',
              'Past performance shown or referred to is not a reliable indicator of future results',
              'You are responsible for your own investment decisions',
              'Consider seeking independent financial advice before investing',
              'Tax treatment depends on individual circumstances and may change',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-amber-400/60 text-sm flex-shrink-0 mt-0.5">{'\u2022'}</span>
                <p className="text-white/60 text-sm">{item}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-400/8 border border-amber-400/20">
            <p className="text-amber-400/80 text-xs leading-relaxed">
              By continuing you confirm you have read and understood this risk warning
              and that you are accessing Aurora Growth Academy for educational purposes only.
              Aurora Growth Academy is not authorised or regulated by the FCA to provide
              financial advice.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <a href="https://www.google.com"
              className="flex-1 py-3 rounded-xl border border-white/10
              text-white/40 text-sm font-bold text-center hover:bg-white/5 transition-all">
              I do not accept &mdash; leave
            </a>
            <button
              onClick={onAccept}
              className="flex-1 py-3 rounded-xl font-bold text-sm
              bg-gradient-to-r from-amber-500 to-orange-500 text-white
              hover:opacity-90 transition-opacity">
              I understand &mdash; continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
