export default function ComplianceFooter() {
  return (
    <footer className="mt-6 rounded-2xl border border-white/6 px-5 py-4"
      style={{ background: 'rgba(8,15,30,0.6)' }}>

      <div className="flex flex-col md:flex-row md:items-start gap-4">

        {/* Educational disclaimer */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="w-0.5 h-full min-h-[1.5rem] rounded-full
            bg-gradient-to-b from-cyan-400/40 to-cyan-400/0 flex-shrink-0 mt-0.5" />
          <p className="text-white/20 text-[11px] leading-relaxed">
            <strong className="text-white/30">Educational purposes only.</strong>
            {' '}Aurora Growth Academy is not authorised or regulated by the FCA.
            Nothing on this platform constitutes financial advice.
          </p>
        </div>

        {/* Risk warning */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="w-0.5 h-full min-h-[1.5rem] rounded-full
            bg-gradient-to-b from-amber-400/40 to-amber-400/0 flex-shrink-0 mt-0.5" />
          <p className="text-white/20 text-[11px] leading-relaxed">
            <strong className="text-amber-400/40">Capital at risk.</strong>
            {' '}Investments can go down as well as up. Past performance is not a reliable indicator of future results.
          </p>
        </div>
      </div>

      {/* Links row */}
      <div className="flex items-center gap-1 flex-wrap mt-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-white/12 text-[10px]">
          &copy; {new Date().getFullYear()} Aurora Growth Academy
        </span>
        {[
          { label: 'Risk Warning', href: '/risk-warning' },
          { label: 'Terms', href: '/terms' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Cookies', href: '/cookies' },
        ].map(link => (
          <span key={link.href} className="flex items-center gap-1">
            <span className="text-white/8 text-[10px] mx-0.5">&middot;</span>
            <a
              href={link.href}
              className="text-white/15 text-[10px] hover:text-cyan-400/50
              transition-colors underline underline-offset-2
              decoration-white/8 hover:decoration-cyan-400/30"
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>

    </footer>
  )
}
