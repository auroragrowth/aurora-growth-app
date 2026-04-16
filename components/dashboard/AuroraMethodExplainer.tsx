'use client'
import { useState } from 'react'

const STEPS = [
  {
    n: '01',
    icon: '\u{1F4E1}',
    title: 'Find stocks that move',
    colour: 'cyan',
    short: 'The scanner finds stocks with a proven track record of rising 20%+ repeatedly.',
    detail: `Aurora starts by identifying stocks that have risen by at least 20% on three or more separate occasions in the last 12 months. This is critical \u2014 a stock that moves this consistently has real momentum behind it and is far more likely to do it again. We call these qualifying rises. The Market Scanner shows you every stock that meets this criteria, ranked and scored so the best opportunities are always at the top.`,
  },
  {
    n: '02',
    icon: '\u{1F3D4}\uFE0F',
    title: 'Identify the last peak',
    colour: 'purple',
    short: 'We find the most recent high point before the current pullback \u2014 the Aurora Peak.',
    detail: `Once a stock has proven it moves well, we look at its most recent qualifying peak \u2014 the highest price it reached before its current decline. This becomes our reference point for everything that follows. Every entry level, every break-even calculation, every profit target is calculated from this peak price. The Aurora Readiness traffic light tells you how far the stock has dropped from this peak right now.`,
  },
  {
    n: '03',
    icon: '\u{1F6A6}',
    title: 'Wait for the right drop',
    colour: 'green',
    short: 'We never rush in. We wait until the stock is at least 20% below its last peak.',
    detail: `This is where most investors go wrong \u2014 they buy too early, when the stock has barely pulled back. Aurora waits. We only consider entering once a stock has dropped at least 20% from its most recent peak. At that level, the risk-to-reward ratio starts to work significantly in your favour. The readiness traffic light turns green when a stock enters this zone \u2014 and that is your signal to start planning your entry, not to panic sell.`,
  },
  {
    n: '04',
    icon: '\u{1FA9C}',
    title: 'Stage your entry \u2014 the Aurora Ladder',
    colour: 'amber',
    short: 'Never go all in at once. Split your investment across multiple price levels as it falls.',
    detail: `The Aurora Ladder is the core of the strategy. Instead of buying everything at one price \u2014 and hoping that was the bottom \u2014 you split your investment across 3 to 4 entry levels based on the stock's own historical price behaviour. Each level is a real price the stock has previously bottomed at. Level 1 is always skipped. Your first buy goes in at Level 2, combining the money allocated to Levels 1 and 2 for a larger initial position. If the stock falls further to Level 3 or 4, you add more \u2014 which reduces your average purchase price. This staged approach means you never need to pick the exact bottom. You simply follow the plan.`,
  },
  {
    n: '05',
    icon: '\u{1F3AF}',
    title: 'Know your break-even before you buy',
    colour: 'blue',
    short: 'The calculator tells you exactly what price the stock needs to reach for you to break even.',
    detail: `Before placing a single order, the Investment Calculator shows you your break-even price \u2014 the exact price the stock needs to return to for you to recover your full investment across all levels. This number is almost always significantly below the original peak price, because your staged entries at lower prices reduce your average cost considerably. Knowing your break-even before you invest removes emotion from the process entirely. You know your numbers. You have a plan.`,
  },
  {
    n: '06',
    icon: '\u{1F4B0}',
    title: 'Take profit at clear targets',
    colour: 'green',
    short: 'Set your exit at 10%, 15%, 20% or 25% above your break-even \u2014 not the original price.',
    detail: `Profit targets in Aurora are calculated from your break-even price \u2014 not the original peak. This is important because it means your targets are achievable even if the stock never fully recovers. A 15% rise from your break-even on a stock you bought 30% below the peak is a very different proposition to needing a 30% recovery. The calculator shows you exactly what price each target corresponds to and how much profit you will make. When the stock reaches your target, you sell. The plan is complete.`,
  },
]

const COLOURS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  cyan:   { bg: 'bg-cyan-400/8',   border: 'border-cyan-400/20',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  purple: { bg: 'bg-purple-400/8', border: 'border-purple-400/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  green:  { bg: 'bg-green-400/8',  border: 'border-green-400/20',  text: 'text-green-400',  dot: 'bg-green-400' },
  amber:  { bg: 'bg-amber-400/8',  border: 'border-amber-400/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  blue:   { bg: 'bg-blue-400/8',   border: 'border-blue-400/20',   text: 'text-blue-400',   dot: 'bg-blue-400' },
}

export default function AuroraMethodExplainer() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showFull, setShowFull] = useState(false)

  return (
    <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.32)] overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8"
        style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(139,92,246,0.08) 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/aurora-logo.png" alt="Aurora" className="h-7 w-auto" />
              <h2 className="text-white font-bold text-lg">The Aurora Method</h2>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-2xl">
              Aurora is not a stock-picking service. It is a structured investment process —
              designed to take emotion out of investing and replace it with a repeatable,
              disciplined system that works with the natural behaviour of quality stocks.
            </p>
          </div>
          <button
            onClick={() => setShowFull(v => !v)}
            className="flex-shrink-0 px-4 py-2 rounded-xl border border-white/10
            bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 transition-all">
            {showFull ? 'Show less \u2191' : 'Read more \u2193'}
          </button>
        </div>

        {/* The one-line summary */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {[
            { icon: '\u{1F50D}', text: 'Find stocks that move' },
            { icon: '\u2192', text: '' },
            { icon: '\u231B', text: 'Wait for 20%+ drop' },
            { icon: '\u2192', text: '' },
            { icon: '\u{1FA9C}', text: 'Ladder in' },
            { icon: '\u2192', text: '' },
            { icon: '\u{1F4B0}', text: 'Take profit at target' },
          ].map((item, i) => (
            item.icon === '\u2192' ? (
              <span key={i} className="text-white/20">{'\u2192'}</span>
            ) : (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5
                rounded-xl bg-white/5 border border-white/8">
                <span className="text-sm">{item.icon}</span>
                <span className="text-white/60 text-xs font-bold">{item.text}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* The 6 steps */}
      <div className="p-6 space-y-3">

        {/* Quick quote */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-center mb-5">
          <p className="text-white/50 text-sm italic leading-relaxed">
            &ldquo;The individual investor should act consistently as an investor and not as a speculator.
            The stock market is designed to transfer money from the active to the patient.&rdquo;
          </p>
          <p className="text-white/25 text-xs mt-2">&mdash; Benjamin Graham</p>
        </div>

        {STEPS.map((step, i) => {
          const c = COLOURS[step.colour]
          const isOpen = expanded === i
          return (
            <div key={i}
              className={`rounded-xl border transition-all overflow-hidden ${
                isOpen ? `${c.bg} ${c.border}` : 'bg-white/3 border-white/8 hover:bg-white/5'
              }`}>
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-4 p-4 text-left">
                {/* Step number */}
                <div className={`w-10 h-10 rounded-xl flex-shrink-0
                  flex items-center justify-center text-lg font-bold
                  ${isOpen ? `${c.bg} ${c.text}` : 'bg-white/5 text-white/30'}`}>
                  {step.icon}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isOpen ? c.text : 'text-white/20'}`}>
                      STEP {step.n}
                    </span>
                    <p className={`font-bold text-sm ${isOpen ? 'text-white' : 'text-white/70'}`}>
                      {step.title}
                    </p>
                  </div>
                  {!isOpen && (
                    <p className="text-white/40 text-xs mt-0.5 truncate">{step.short}</p>
                  )}
                </div>
                {/* Chevron */}
                <span className={`text-xs flex-shrink-0 transition-transform ${
                  isOpen ? `${c.text} rotate-180` : 'text-white/20'
                }`}>{'\u25BC'}</span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 ml-14">
                  <p className={`text-sm font-bold mb-2 ${c.text}`}>{step.short}</p>
                  <p className="text-white/60 text-sm leading-relaxed">{step.detail}</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Why it works section — shown when showFull */}
        {showFull && (
          <div className="space-y-4 pt-4 border-t border-white/8">

            <h3 className="text-white font-bold text-base">Why Aurora works</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  icon: '\u{1F9E0}',
                  title: 'Removes emotion',
                  body: 'Every decision is pre-planned before a single order is placed. You know exactly when to buy, how much to invest at each level, and when to take profit. There is nothing left to feel \u2014 only a plan to follow.'
                },
                {
                  icon: '\u{1F4C9}',
                  title: 'Works with falling prices',
                  body: 'Most investors are paralysed when a stock falls. Aurora investors welcome it \u2014 because a lower price means a better average entry, a lower break-even, and a higher potential return when the stock recovers.'
                },
                {
                  icon: '\u{1F3AF}',
                  title: 'Realistic targets',
                  body: 'Because your break-even is well below the peak price, profit targets of 10-25% are far more achievable than they would be if you had bought at the top. The maths works in your favour.'
                },
                {
                  icon: '\u{1F501}',
                  title: 'Repeatable and scalable',
                  body: 'The process is identical for every stock, every time. Once you have done it once, you can run the same process across multiple positions simultaneously \u2014 each one following the same disciplined plan.'
                },
              ].map(item => (
                <div key={item.title}
                  className="p-4 rounded-xl bg-white/3 border border-white/8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-white font-bold text-sm">{item.title}</p>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            {/* Common mistakes */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
              <p className="text-red-400 font-bold text-sm mb-3">
                {'\u2717'} What Aurora is designed to prevent
              </p>
              <div className="space-y-2">
                {[
                  'Buying too early \u2014 before the stock has pulled back enough to offer real upside',
                  'Going all in at once \u2014 leaving nothing to add if the price falls further',
                  'Selling in panic \u2014 because you do not have a plan and the loss feels unbearable',
                  'Chasing momentum \u2014 buying stocks that are rising fast with no plan for when they fall',
                  'Holding forever \u2014 because you never defined what a successful exit looked like',
                ].map((mistake, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-red-400/60 text-xs mt-0.5 flex-shrink-0">{'\u2717'}</span>
                    <p className="text-white/40 text-xs leading-relaxed">{mistake}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="p-4 rounded-xl border text-center space-y-2"
              style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.1) 0%, rgba(139,92,246,0.08) 100%)', borderColor: 'rgba(87,211,243,0.2)' }}>
              <p className="text-white font-bold">Ready to start?</p>
              <p className="text-white/40 text-sm">
                Go to the Market Scanner to find your first Aurora opportunity.
                Green stocks are ready now.
              </p>
              <a href="/dashboard/market-scanner"
                className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl
                font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500
                text-white hover:opacity-90 transition-opacity">
                Open Market Scanner {'\u2192'}
              </a>
            </div>
          </div>
        )}

        <p className="text-xs text-center pt-2" style={{ color: '#cbd5e1' }}>
          Aurora Growth Academy is for educational purposes only and does not constitute financial advice.
        </p>
      </div>
    </div>
  )
}
