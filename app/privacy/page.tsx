export default function PrivacyPage() {
  const updated = '10 April 2026'
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#030712' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <a href="/dashboard" className="text-white/30 text-xs hover:text-white/60 underline">
            &larr; Back to Aurora Growth Academy
          </a>
          <h1 className="text-white text-3xl font-bold mt-4">Privacy Policy</h1>
          <p className="text-white/30 text-sm mt-1">Last updated: {updated}</p>
        </div>

        <div className="p-5 rounded-2xl bg-cyan-400/8 border border-cyan-400/20">
          <p className="text-cyan-400 font-bold text-sm mb-1">Your privacy matters to us</p>
          <p className="text-white/60 text-sm leading-relaxed">
            This policy explains what personal data we collect, how we use it, and your rights under
            the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
        </div>

        {[
          {
            title: '1. Who we are',
            body: `Aurora Growth Academy is the data controller for personal data collected through this Platform. For data protection enquiries contact us at: info@auroragrowth.co.uk`
          },
          {
            title: '2. What data we collect',
            body: `We collect the following personal data:

Account data: email address, name (if provided), password (encrypted).

Usage data: pages visited, features used, time spent on the Platform, browser type, device type, IP address.

Subscription data: subscription plan, payment history (payment card details are handled by Stripe and never stored by us).

Broker connection data: Trading 212 API key (stored encrypted). We do not store your Trading 212 account password.

Telegram data: your Telegram chat ID if you choose to connect Telegram for alerts.

Communication data: emails sent to or received from us.`
          },
          {
            title: '3. How we use your data',
            body: `We use your personal data to:

Provide and operate the Platform and your account.
Process your subscription payments.
Send you service emails including account confirmations, subscription notices, and onboarding messages.
Send you Telegram notifications if you have connected Telegram.
Improve the Platform through analysis of usage patterns.
Comply with our legal obligations.

We do not use your data for automated decision-making that produces legal or similarly significant effects on you.`
          },
          {
            title: '4. Legal basis for processing',
            body: `We process your personal data on the following legal bases:

Contract: processing your subscription and providing the service you have signed up for.
Legitimate interests: improving the Platform and keeping it secure.
Legal obligation: complying with applicable laws.
Consent: sending marketing communications (you can withdraw consent at any time).`
          },
          {
            title: '5. Data sharing',
            body: `We share your personal data with the following third parties only where necessary:

Supabase (database hosting \u2014 EU West region).
Stripe (payment processing).
Resend (transactional email delivery).
Telegram (if you connect Telegram alerts).

We do not sell your personal data to any third party. We do not share your data for marketing purposes.`
          },
          {
            title: '6. Data retention',
            body: `We retain your personal data for as long as your account is active. If you close your account we will delete your personal data within 30 days, except where we are required to retain it for legal or tax purposes (typically up to 7 years for financial records).

Usage and analytics data is retained in anonymised form.`
          },
          {
            title: '7. Your rights under UK GDPR',
            body: `You have the following rights regarding your personal data:

Right of access: request a copy of the data we hold about you.
Right to rectification: request correction of inaccurate data.
Right to erasure: request deletion of your data (\u201Cright to be forgotten\u201D).
Right to restriction: request that we limit processing of your data.
Right to data portability: receive your data in a machine-readable format.
Right to object: object to processing based on legitimate interests.
Right to withdraw consent: withdraw consent at any time where processing is based on consent.

To exercise any of these rights contact us at info@auroragrowth.co.uk. We will respond within 30 days.

You also have the right to lodge a complaint with the Information Commissioner\u2019s Office (ICO) at ico.org.uk.`
          },
          {
            title: '8. Security',
            body: `We take the security of your personal data seriously. We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. API keys are stored encrypted. Access to production data is restricted to authorised personnel only.

Despite these measures no internet transmission is 100% secure. Please use a strong password and enable two-factor authentication on your account.`
          },
          {
            title: '9. Cookies',
            body: `We use cookies and similar technologies to operate the Platform. Please see our Cookie Policy for details.`
          },
          {
            title: '10. Changes to this policy',
            body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email. The date at the top of this page shows when it was last updated.`
          },
          {
            title: '11. Contact',
            body: `Data protection enquiries: info@auroragrowth.co.uk

Information Commissioner\u2019s Office (ICO): ico.org.uk \u00B7 0303 123 1113`
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

        <p className="text-white/20 text-xs text-center">
          Aurora Growth Academy &middot; {updated}
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
