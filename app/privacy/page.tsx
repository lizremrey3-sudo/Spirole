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
            <h2 className="mb-3 text-base font-semibold text-white">1. Introduction</h2>
            <p>
              Spirole ("we," "our," or "us") is a product of RoleSpar LLC, a Wisconsin limited liability
              company. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use Spirole at spiroletrainer.com. Please read this policy carefully.
              If you disagree with its terms, please discontinue use of the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. Information We Collect</h2>
            <p className="mb-3 font-medium text-white/80">Information you provide directly:</p>
            <ul className="mb-5 flex flex-col gap-1.5 pl-4">
              {[
                'Account information: name, email address, and password when you register',
                'Practice information: your optical practice name and team structure',
                'Session content: text messages and voice recordings you submit during AI training sessions',
                'Performance data: self-reported weekly metrics you log in the platform',
                'Commitment responses: written reflections you save in the Think It Through feature',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mb-3 font-medium text-white/80">Information collected automatically:</p>
            <ul className="flex flex-col gap-1.5 pl-4">
              {[
                'Usage data: pages visited, features used, session duration',
                'Device information: browser type, operating system, IP address',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="flex flex-col gap-1.5 pl-4">
              {[
                'Provide, operate, and improve the Spirole training platform',
                'Generate AI-powered roleplay scenarios and performance evaluations',
                'Analyze vocal delivery patterns to provide coaching feedback',
                'Display performance trends and coaching insights to you and your managers',
                'Process payments and manage your subscription',
                'Send administrative emails including invitations, password resets, and account notices',
                'Respond to your support requests',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Voice Recordings</h2>
            <p>
              When you use the microphone feature during training sessions, your voice is recorded and
              transmitted to Hume AI for vocal delivery analysis. Voice recordings are retained for 90
              days and then permanently deleted. Hume AI processes your voice data solely to generate
              delivery scores — your recordings are not used to train third-party AI models without your
              explicit consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. AI-Generated Content</h2>
            <p>
              Session transcripts and AI evaluations are generated using Claude, an AI model provided by
              Anthropic. Your session content is transmitted to Anthropic's API for processing.
              Anthropic's use of this data is governed by their privacy policy and API terms of service.
              We do not permit your data to be used to train Anthropic's models under our API agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. How We Share Your Information</h2>
            <p className="mb-4">
              We do not sell your personal information. We share your information only in the following
              circumstances:
            </p>
            <p className="mb-2 font-medium text-white/80">With your employer or practice:</p>
            <p className="mb-4">
              If you access Spirole through a practice account, your managers and practice administrators
              can view your session scores, evaluations, and performance trends. This is a core feature
              of the platform.
            </p>
            <p className="mb-2 font-medium text-white/80">With service providers:</p>
            <p className="mb-3">
              We share data with the following processors to operate the platform:
            </p>
            <ul className="mb-4 flex flex-col gap-1.5 pl-4">
              {[
                'Supabase — database and authentication',
                'Anthropic — AI roleplay and evaluation',
                'Hume AI — vocal delivery analysis',
                'Stripe — payment processing',
                'Resend — transactional email delivery',
                'Vercel — application hosting',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mb-2 font-medium text-white/80">For legal reasons:</p>
            <p>
              We may disclose your information if required by law, subpoena, or other legal process, or
              if we believe disclosure is necessary to protect the rights, property, or safety of
              RoleSpar LLC, our users, or the public.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Data Retention</h2>
            <p className="mb-3">We retain your data for the following periods:</p>
            <ul className="mb-4 flex flex-col gap-1.5 pl-4">
              {[
                'Session transcripts and evaluation scores: 2 years from the date of the session',
                'Voice recordings: 90 days from the date of the session',
                'Account and profile data: duration of your active subscription plus 1 year following account closure',
                'Payment records: 7 years as required for tax and legal compliance',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              You may request deletion of your data at any time by contacting us at{' '}
              <a href="mailto:support@spiroletrainer.com" className="text-[#2dd4bf] hover:underline">
                support@spiroletrainer.com
              </a>
              . Upon verified request, we will delete your personal data within 30 days, except where
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">8. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including
              encrypted data transmission (TLS), row-level security on all database tables, and access
              controls limiting data visibility to authorized users within your practice. No method of
              transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">9. Children's Privacy</h2>
            <p>
              Spirole is intended for use by adults in professional optical practice settings. We do not
              knowingly collect personal information from anyone under 18 years of age. If we learn we
              have collected such information, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">10. Users in the United States</h2>
            <p>
              Spirole is currently operated for users in the United States. If you are accessing the
              platform from outside the United States, please be aware that your information may be
              transferred to and processed in the United States.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">11. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="mb-4 flex flex-col gap-1.5 pl-4">
              {[
                'Access the personal information we hold about you',
                'Request correction of inaccurate data',
                'Request deletion of your data (subject to legal retention requirements)',
                'Opt out of non-essential communications',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@spiroletrainer.com" className="text-[#2dd4bf] hover:underline">
                support@spiroletrainer.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes
              by posting the new policy on this page with an updated date and, where appropriate, by
              email. Your continued use of Spirole after changes are posted constitutes your acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">13. Contact Us</h2>
            <p className="text-white/50">
              RoleSpar LLC<br />
              <a href="mailto:support@spiroletrainer.com" className="text-[#2dd4bf] hover:underline">
                support@spiroletrainer.com
              </a><br />
              <a href="https://spiroletrainer.com" target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:underline">
                spiroletrainer.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
