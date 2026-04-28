import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Spirole' }

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-[#2dd4bf] hover:underline">
          ← Back
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-10 text-sm text-white/40">Last updated: April 28, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide directly (name, email, password), information generated
              through your use of the Service (session transcripts, evaluation scores, coaching notes),
              and standard usage data (login times, feature usage).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. How We Use Your Information</h2>
            <p>
              We use your information to operate and improve the Service, generate AI-powered training
              evaluations, provide managers with team performance insights, and communicate with you
              about your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. Session Data</h2>
            <p>
              Training session transcripts and audio recordings are stored securely and used solely to
              generate performance evaluations. Managers within your organization may have access to
              session evaluations as part of their coaching role.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data only with service providers necessary to
              operate the Service (cloud hosting, AI processing, email delivery) and as required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. Data Security</h2>
            <p>
              We use industry-standard security measures including encryption in transit and at rest,
              row-level security on all database tables, and access controls to protect your data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data by contacting
              us. Account deletion removes your data from active systems, subject to legal retention
              requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Contact</h2>
            <p>
              Questions about this Privacy Policy? Contact us at{' '}
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
