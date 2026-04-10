export default function TermsPage() {
  const updated = '10 April 2026'
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#030712' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <a href="/dashboard" className="text-white/30 text-xs hover:text-white/60 underline">
            &larr; Back to Aurora Growth Academy
          </a>
          <h1 className="text-white text-3xl font-bold mt-4">Terms of Service</h1>
          <p className="text-white/30 text-sm mt-1">Last updated: {updated}</p>
        </div>

        {[
          {
            title: '1. About Aurora Growth Academy',
            body: `Aurora Growth Academy (\u201Cwe\u201D, \u201Cus\u201D, \u201Cour\u201D) is an educational software platform that provides investment methodology tools, market information, and educational content. Aurora Growth Academy is operated as an educational service and is not a financial services firm, investment adviser, stockbroker, or portfolio manager.

Aurora Growth Academy is not authorised or regulated by the Financial Conduct Authority (FCA) or any other financial regulator to provide financial advice, investment advice, or portfolio management services.`
          },
          {
            title: '2. Educational Purpose Only',
            body: `All content, tools, calculators, data, analysis, and information provided on Aurora Growth Academy (\u201Cthe Platform\u201D) is for educational and informational purposes only.

Nothing on the Platform constitutes or should be construed as: financial advice; investment advice; a recommendation to buy or sell any investment; an offer or solicitation to buy or sell any investment; or tax advice.

You are solely responsible for all investment decisions you make. We strongly recommend you seek independent regulated financial advice before making any investment decision.`
          },
          {
            title: '3. Subscription and Payment',
            body: `Aurora Growth Academy offers paid subscription plans (Core, Pro, Elite) providing access to the Platform\u2019s features. By subscribing you agree to pay the applicable subscription fee.

Subscriptions are billed on a recurring monthly or annual basis as selected at the time of purchase. Payments are processed by Stripe. You can cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period.

We reserve the right to change subscription pricing with 30 days\u2019 notice to existing subscribers.`
          },
          {
            title: '4. Acceptable Use',
            body: `You agree to use Aurora Growth Academy solely for your own personal educational purposes. You must not: share your account credentials with others; redistribute, resell, or commercially exploit any content from the Platform; use automated tools to scrape or extract data from the Platform; use the Platform for any unlawful purpose; or attempt to circumvent any security measures.

You must be at least 18 years of age to use Aurora Growth Academy.`
          },
          {
            title: '5. Third-Party Integrations',
            body: `Aurora Growth Academy integrates with third-party services including Trading 212 and Telegram. Your use of these services is subject to their own terms and conditions. Aurora Growth Academy does not hold, manage, or have access to your investment funds through any broker integration. Any orders placed through broker integrations are placed by you directly with your broker.`
          },
          {
            title: '6. Disclaimer of Warranties',
            body: `The Platform is provided \u201Cas is\u201D without any warranty of any kind, express or implied. We do not warrant that: the Platform will be uninterrupted or error-free; market data will be accurate, complete, or up to date; any investment methodology will generate profits; or the Platform will meet your particular requirements.

Market data is provided for educational purposes and may be delayed. Do not rely on Platform data for time-sensitive trading decisions.`
          },
          {
            title: '7. Limitation of Liability',
            body: `To the fullest extent permitted by law, Aurora Growth Academy shall not be liable for any investment losses, financial losses, or any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or your reliance on any information provided.

Our total liability to you for any direct losses shall not exceed the total subscription fees paid by you in the 12 months preceding the claim.`
          },
          {
            title: '8. Intellectual Property',
            body: `All content, methodology, software, and materials on the Platform are the intellectual property of Aurora Growth Academy and are protected by applicable copyright and other intellectual property laws. You may not copy, reproduce, distribute, or create derivative works from any Platform content without our written permission.`
          },
          {
            title: '9. Privacy',
            body: `Your use of Aurora Growth Academy is subject to our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform you consent to our collection and use of your personal data as described in our Privacy Policy.`
          },
          {
            title: '10. Changes to Terms',
            body: `We reserve the right to update these Terms at any time. We will notify you of material changes by email or via the Platform. Your continued use of the Platform after changes take effect constitutes your acceptance of the revised Terms.`
          },
          {
            title: '11. Governing Law',
            body: `These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.`
          },
          {
            title: '12. Contact',
            body: `For any questions about these Terms please contact us at: info@auroragrowth.co.uk`
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

        <div className="p-4 rounded-xl bg-amber-400/8 border border-amber-400/20">
          <p className="text-amber-400/80 text-xs leading-relaxed">
            <strong>Educational use only.</strong> Aurora Growth Academy does not provide financial advice
            and is not regulated by the FCA. Capital at risk.
          </p>
        </div>

        <p className="text-white/20 text-xs text-center">
          Aurora Growth Academy &middot; {updated}
        </p>
      </div>
    </div>
  )
}
