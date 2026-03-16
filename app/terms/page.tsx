import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_right,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_35%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Back to signup
          </Link>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-10 text-center">
            <div className="relative mb-6 flex justify-center">
              <div className="absolute h-28 w-28 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-2xl" />
              <img
                src="/aurora-logo.png"
                alt="Aurora Growth"
                className="relative h-28 w-auto"
              />
            </div>

            <h1 className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
              Terms & Conditions
            </h1>

            <p className="mt-4 text-white/70">Effective date: 10 March 2026</p>
          </div>

          <div className="space-y-8 text-sm leading-7 text-white/80 sm:text-base">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">1. Introduction</h2>
              <p>
                These Terms & Conditions govern your use of Aurora Growth, including
                our website, dashboard, member areas, watchlists, calculators,
                analytics, and related digital services. By using Aurora Growth or
                creating an account, you agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">2. About the Service</h2>
              <p>
                Aurora Growth is a digital platform providing access to market tools,
                research features, educational content, dashboards, subscription
                services, and related software functionality.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">3. Eligibility</h2>
              <p>
                You must be at least 18 years old and legally able to enter into a
                binding agreement to use Aurora Growth. You agree that any information
                you provide during registration is accurate and complete.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">4. Your Account</h2>
              <p>
                You are responsible for keeping your login details secure and for any
                activity carried out under your account. You must notify us promptly if
                you believe your account has been accessed without authorisation.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">5. Subscriptions and Payments</h2>
              <p>
                Some features may only be available under a paid plan. By subscribing,
                you agree to pay the applicable fees and any recurring charges unless
                cancelled. We may suspend or remove paid access if payment fails,
                expires, is reversed, or is cancelled.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">6. No Financial Advice</h2>
              <p>
                Aurora Growth is provided for educational, informational, and research
                purposes only. Nothing on the platform constitutes financial,
                investment, legal, or tax advice, or a recommendation to buy or sell
                any asset, instrument, or security. You remain fully responsible for
                your own decisions.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">7. Data and Availability</h2>
              <p>
                We do not guarantee that any market data, alerts, screeners, charts,
                prices, analytics, or other information displayed through Aurora Growth
                will always be accurate, complete, current, uninterrupted, or error-free.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">8. Acceptable Use</h2>
              <p>
                You agree not to misuse Aurora Growth, attempt unauthorised access,
                interfere with the service, upload harmful code, scrape protected
                content, resell restricted features, or use the platform for unlawful,
                abusive, or fraudulent purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">9. Intellectual Property</h2>
              <p>
                All branding, software, layouts, dashboards, text, graphics, content,
                and platform functionality are owned by or licensed to Aurora Growth
                unless otherwise stated. You may not copy, modify, distribute, or
                commercially exploit any part of the service without permission.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">10. Suspension and Termination</h2>
              <p>
                We may suspend, restrict, or terminate access where necessary for
                security, maintenance, legal reasons, non-payment, or breach of these
                Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">11. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Aurora Growth shall not be
                liable for any indirect, incidental, special, consequential, or
                economic loss, including trading losses, investment losses, loss of
                profits, loss of data, or business interruption arising from use of the
                platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">12. Service Provided As Is</h2>
              <p>
                Aurora Growth is provided on an “as is” and “as available” basis,
                without warranties of any kind, whether express or implied.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">13. Changes to the Service</h2>
              <p>
                We may update, improve, suspend, withdraw, or change any part of Aurora
                Growth at any time, including features, plans, integrations, and
                pricing.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">14. Changes to These Terms</h2>
              <p>
                We may revise these Terms from time to time. Continued use of Aurora
                Growth after changes take effect means you accept the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">15. Governing Law</h2>
              <p>
                These Terms are governed by the laws of England and Wales. Any dispute
                relating to them shall be subject to the exclusive jurisdiction of the
                courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">16. Contact</h2>
              <p>
                If you have any questions about these Terms & Conditions, please
                contact Aurora Growth using the contact details shown on the website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
