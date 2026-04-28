import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Spirole' }

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-[#2dd4bf] hover:underline">
          ← Back
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mb-10 text-sm text-white/40">Last updated: April 28, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Spirole ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. Use of the Service</h2>
            <p>
              Spirole is an AI-powered sales training platform for optical practices. You may use the
              Service only for lawful purposes and in accordance with these Terms. You agree not to
              misuse the Service or help anyone else do so.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activity that occurs under your account. Notify us immediately of any unauthorized
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-[#2dd4bf] hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to generate training scenarios, evaluations, and
              coaching feedback. AI-generated content is provided for training purposes only and should
              not be relied upon as professional advice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Spirole shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the updated Terms. We will notify active users of material changes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">8. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:support@spiroletrainer.com" className="text-[#2dd4bf] hover:underline">
                support@spiroletrainer.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
