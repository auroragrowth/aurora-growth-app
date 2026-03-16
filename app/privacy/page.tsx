import Link from "next/link";

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>

            <p className="mt-4 text-white/70">Effective date: 10 March 2026</p>
          </div>

          <div className="space-y-8 text-sm leading-7 text-white/80 sm:text-base">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">1. Introduction</h2>
              <p>
                This Privacy Policy explains how Aurora Growth collects, uses, stores,
                and protects your personal information when you use our website,
                dashboard, member services, and related digital products.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">2. Information We Collect</h2>
              <p>We may collect personal information such as:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>full name</li>
                <li>email address</li>
                <li>phone number</li>
                <li>account credentials and login-related data</li>
                <li>subscription and billing-related details</li>
                <li>device, browser, and usage analytics</li>
                <li>messages or enquiries you send to us</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">3. How We Use Your Information</h2>
              <p>We may use your information to:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>create and manage your account</li>
                <li>provide access to Aurora Growth services and features</li>
                <li>process subscriptions and related billing</li>
                <li>send service messages, login emails, and account notifications</li>
                <li>improve platform performance and user experience</li>
                <li>provide support and respond to enquiries</li>
                <li>protect the security and integrity of the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">4. Lawful Basis</h2>
              <p>
                We process personal data where necessary to perform our contract with
                you, pursue legitimate business interests, comply with legal
                obligations, or where you have given consent.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">5. Sharing of Information</h2>
              <p>
                We may share information with trusted service providers and technology
                partners that help us operate Aurora Growth, such as hosting,
                authentication, analytics, communications, and payment providers. We do
                not sell your personal data.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">6. Security</h2>
              <p>
                We take reasonable technical and organisational measures to help
                protect your personal information. However, no system can be guaranteed
                to be completely secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">7. Retention</h2>
              <p>
                We retain personal information only for as long as reasonably necessary
                for account operation, legal compliance, dispute resolution, internal
                record keeping, and related business purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">8. Cookies and Analytics</h2>
              <p>
                Aurora Growth may use cookies, local storage, and analytics
                technologies to maintain login sessions, remember preferences,
                understand platform usage, and improve performance.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">9. Your Rights</h2>
              <p>
                Subject to applicable law, you may have the right to request access
                to, correction of, deletion of, restriction of, or objection to the
                processing of your personal information. You may also have the right to
                request a copy of certain personal data.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">10. Third-Party Services</h2>
              <p>
                Aurora Growth may integrate with third-party services such as payment
                processors, authentication systems, and data providers. Those services
                operate under their own terms and privacy policies.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">11. Children’s Privacy</h2>
              <p>
                Aurora Growth is not intended for users under the age of 18, and we do
                not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">12. Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will
                be posted on this page together with a revised effective date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-white">13. Contact</h2>
              <p>
                If you have questions about this Privacy Policy or how Aurora Growth
                handles personal data, please contact us using the contact details on
                our website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
