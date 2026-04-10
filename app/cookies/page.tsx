export default function CookiesPage() {
  const updated = '10 April 2026'
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#030712' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <a href="/dashboard" className="text-white/30 text-xs hover:text-white/60 underline">
            &larr; Back to Aurora Growth Academy
          </a>
          <h1 className="text-white text-3xl font-bold mt-4">Cookie Policy</h1>
          <p className="text-white/30 text-sm mt-1">Last updated: {updated}</p>
        </div>

        {[
          {
            title: 'What are cookies?',
            body: `Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work, remember your preferences, and provide information to website owners.`
          },
          {
            title: 'How we use cookies',
            body: `Aurora Growth Academy uses a minimal number of cookies that are strictly necessary to operate the Platform. We do not use advertising cookies, tracking cookies, or share cookie data with third parties for marketing purposes.`
          },
          {
            title: 'Strictly necessary cookies',
            body: `These cookies are essential for the Platform to function and cannot be switched off.

Authentication session: keeps you logged in to your Aurora Growth Academy account. Without this cookie you would need to log in on every page.

Security tokens: CSRF protection to prevent cross-site request forgery attacks.

These cookies do not contain any personal information beyond what is necessary to identify your session.`
          },
          {
            title: 'Functional cookies',
            body: `These cookies remember your preferences to improve your experience.

UI preferences: remembers settings such as which scanner tab you last viewed and display preferences.

Onboarding state: remembers whether you have completed the welcome tour so it is not shown repeatedly.

These cookies are stored locally in your browser and are not transmitted to any third party.`
          },
          {
            title: 'Analytics',
            body: `We currently do not use any third-party analytics cookies (such as Google Analytics). We use aggregated server-side logging to understand Platform usage. This does not involve placing cookies on your device.`
          },
          {
            title: 'Third-party cookies',
            body: `Some features of the Platform embed content from third parties which may set their own cookies:

TradingView charts: TradingView may set cookies when you view embedded charts. These are subject to TradingView\u2019s own privacy policy.

Stripe: if you access the payment flow, Stripe may set cookies for fraud prevention purposes.

We do not control these third-party cookies. You can manage them through your browser settings.`
          },
          {
            title: 'Managing cookies',
            body: `You can control and delete cookies through your browser settings. Please note that deleting strictly necessary cookies will prevent Aurora Growth Academy from functioning correctly \u2014 you will be signed out and your preferences will be lost.

Most browsers allow you to: view cookies that have been set; delete all or individual cookies; block cookies from specific sites; block all cookies.

For instructions on how to manage cookies in your browser visit: allaboutcookies.org`
          },
          {
            title: 'Changes to this policy',
            body: `We may update this Cookie Policy as our use of cookies changes. The date at the top of this page shows when it was last updated.`
          },
          {
            title: 'Contact',
            body: `For questions about our use of cookies: info@auroragrowth.co.uk`
          },
        ].map(section => (
          <div key={section.title}
            className="p-6 rounded-2xl space-y-3"
            style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-bold text-base">{section.title}</h2>
            {section.body.split('\n\n').map((para, i) => (
              <p key={i} className="text-white/60 text-sm leading-relaxed">{para}</p>
            ))}
          </div>
        ))}

        <p className="text-white/20 text-xs text-center">Aurora Growth Academy &middot; {updated}</p>

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
