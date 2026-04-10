export default function RiskWarningPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#030712' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <p className="text-amber-400 text-sm font-bold uppercase tracking-wider mb-2">
            {'\u26A0'} Risk Warning
          </p>
          <h1 className="text-white text-3xl font-bold">Important Risk Information</h1>
          <p className="text-white/40 text-sm mt-2">
            Please read this carefully before using Aurora Growth Academy.
          </p>
        </div>

        {[
          {
            title: "Don\u2019t invest unless you\u2019re prepared to lose all the money you invest",
            content: "This is a high-risk investment education service. Investments in equities (stocks and shares) are high risk and speculative. The value of investments can go down as well as up, and you may lose some or all of the money you invest. You should not invest money you cannot afford to lose."
          },
          {
            title: "Aurora Growth Academy is for educational purposes only",
            content: "Aurora Growth Academy provides educational tools, information, and investment methodology for learning purposes only. Nothing on this platform constitutes, and should not be construed as, financial advice, investment advice, trading advice, or any other type of advice. Aurora Growth Academy is not authorised or regulated by the Financial Conduct Authority (FCA) or any other financial regulator to provide financial advice."
          },
          {
            title: "You are responsible for your own investment decisions",
            content: "Any investment decisions you make are entirely your own. Aurora Growth Academy bears no responsibility for any losses you incur as a result of using information, tools, or methodologies provided on this platform. You should conduct your own research and consider seeking independent professional financial advice before making any investment decision."
          },
          {
            title: "Past performance is not indicative of future results",
            content: "Any historical performance data, examples, or case studies shown on this platform are provided for educational and illustrative purposes only. Past performance of any investment, strategy, or methodology is not a reliable indicator of future results. Markets can and do behave differently in the future from how they have behaved in the past."
          },
          {
            title: "Market and liquidity risks",
            content: "Investments in equities are subject to market risk, which means prices can fluctuate significantly over short and long periods. There may be times when it is difficult or impossible to sell an investment at an acceptable price. Individual company stocks can lose significant value or become worthless if the company experiences financial difficulty or failure."
          },
          {
            title: "Tax considerations",
            content: "The tax treatment of investments depends on your individual circumstances and may be subject to change in the future. Aurora Growth Academy does not provide tax advice. You should consult a qualified tax adviser regarding the tax implications of any investment decisions you make."
          },
          {
            title: "No FCA authorisation",
            content: "Aurora Growth Academy is not authorised or regulated by the Financial Conduct Authority (FCA) or any other financial services regulator. We do not hold, manage, or have access to your investment funds. We do not place trades on your behalf without your explicit instruction. Aurora Growth Academy is a software tool and educational resource, not a financial services firm."
          },
        ].map(section => (
          <div key={section.title}
            className="p-6 rounded-2xl space-y-3"
            style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-bold text-base">{section.title}</h2>
            <p className="text-white/60 text-sm leading-relaxed">{section.content}</p>
          </div>
        ))}

        <div className="p-6 rounded-2xl bg-amber-400/8 border border-amber-400/20">
          <p className="text-amber-400 font-bold text-sm mb-2">
            If you are unsure whether investing is right for you
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            The FCA&apos;s Money Advice Service offers free, impartial financial guidance.
            Visit{' '}
            <a href="https://www.moneyhelper.org.uk" target="_blank" rel="noopener noreferrer"
              className="text-amber-400 underline">
              moneyhelper.org.uk
            </a>
            {' '}or call 0800 138 7777.
            For regulated financial advice, consult a qualified Independent Financial Adviser (IFA).
            You can find one at{' '}
            <a href="https://www.unbiased.co.uk" target="_blank" rel="noopener noreferrer"
              className="text-amber-400 underline">
              unbiased.co.uk
            </a>.
          </p>
        </div>

        <p className="text-white/20 text-xs text-center">
          Last updated: 10 April 2026 &middot; Aurora Growth Academy
        </p>

        <div className="text-center">
          <a href="/dashboard"
            className="px-6 py-3 rounded-xl font-bold text-sm
            bg-white/10 text-white/60 hover:bg-white/15 transition-all">
            &larr; Back to Aurora Growth Academy
          </a>
        </div>
      </div>
    </div>
  )
}
