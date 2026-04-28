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
        <p className="mb-10 text-sm text-white/40">Effective Date: April 12, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-white/70">

          <p>
            These Terms of Service ("Terms") govern your access to and use of Spirole, an AI-powered
            sales training platform operated by RoleSpar LLC, a Wisconsin limited liability company
            ("RoleSpar," "we," "us," or "our"). By creating an account or using Spirole, you agree to
            these Terms. If you do not agree, do not use the platform.
          </p>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Spirole, you represent that you are at least 18 years of age, have
              the authority to enter into these Terms on behalf of yourself or your organization, and
              agree to be bound by these Terms and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">2. Description of Service</h2>
            <p className="mb-3">
              Spirole is an AI-powered training platform designed for optical retail associates and
              practice managers. The platform provides:
            </p>
            <ul className="flex flex-col gap-1.5 pl-4">
              {[
                'Roleplay-based training scenarios powered by artificial intelligence',
                'Session evaluation and scoring',
                'Performance tracking and team dashboards',
                'Manager coaching tools and analytics',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">3. User Accounts and Access</h2>
            <p className="mb-4 font-medium text-white/80">3.1 Account Creation</p>
            <p className="mb-4">
              Accounts are created through an invitation issued by a practice manager or administrator.
              You are responsible for maintaining the confidentiality of your login credentials and for
              all activity that occurs under your account.
            </p>
            <p className="mb-3 font-medium text-white/80">3.2 Authorized Use</p>
            <p>
              Spirole is licensed for use by authorized employees and staff of subscribing optical retail
              practices. Sharing accounts or credentials with unauthorized individuals is prohibited.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">4. Subscription and Payment</h2>
            <p>
              Access to Spirole is provided on a subscription basis to practices. Subscription fees,
              billing cycles, and payment terms are set forth in the applicable order form or subscription
              agreement between RoleSpar and the subscribing practice. RoleSpar reserves the right to
              modify pricing with 30 days written notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">5. Data, Privacy, and AI Training</h2>
            <p className="mb-4 font-medium text-white/80">5.1 Session Data</p>
            <p className="mb-4">
              Training sessions conducted on Spirole, including roleplay conversations, evaluation scores,
              and coaching interactions, are stored on our servers and associated with your account and
              practice.
            </p>
            <p className="mb-3 font-medium text-white/80">5.2 Use of Data to Improve AI Models</p>
            <p className="mb-4">
              By using Spirole, you agree that RoleSpar may use anonymized and aggregated session data,
              including training conversations and evaluation outcomes, to improve, fine-tune, and develop
              AI models that power Spirole and related RoleSpar products. All data used for AI training
              purposes will be de-identified prior to use and will not be attributable to any individual
              user, associate, or practice.
            </p>
            <p className="mb-3 font-medium text-white/80">5.3 Privacy</p>
            <p>
              RoleSpar does not sell personal data to third parties. Data handling is governed by our{' '}
              <Link href="/privacy" className="text-[#2dd4bf] hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="flex flex-col gap-1.5 pl-4">
              {[
                'Use Spirole for any unlawful purpose or in violation of applicable laws',
                'Attempt to reverse engineer, decompile, or extract proprietary AI models or algorithms',
                'Input protected health information (PHI) or other sensitive patient data into training sessions',
                'Share, resell, or sublicense access to the platform',
                'Interfere with or disrupt the integrity or performance of the platform',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-[#2dd4bf]">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">7. Intellectual Property</h2>
            <p>
              All content, features, AI models, and functionality within Spirole are the exclusive
              property of RoleSpar LLC and are protected by applicable intellectual property laws. You
              are granted a limited, non-exclusive, non-transferable license to use the platform solely
              for your internal training purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">8. Disclaimer of Warranties</h2>
            <p>
              Spirole is provided "as is" and "as available" without warranties of any kind, express or
              implied. RoleSpar does not warrant that the platform will be error-free, uninterrupted, or
              that AI-generated content will be accurate or suitable for any specific purpose. Training
              outcomes may vary and are not guaranteed.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, RoleSpar LLC shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or
              inability to use Spirole. RoleSpar's total liability shall not exceed the amounts paid by
              the subscribing practice in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">10. Termination</h2>
            <p>
              RoleSpar may suspend or terminate access to Spirole at any time for violation of these
              Terms or non-payment of subscription fees. Upon termination, your right to access the
              platform ceases immediately. Provisions relating to intellectual property, data, and
              limitation of liability survive termination.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">11. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the State of Wisconsin, without regard to conflict
              of law principles. Any disputes arising under these Terms shall be resolved through binding
              arbitration in Wisconsin, except that either party may seek injunctive relief in a court of
              competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">12. Changes to Terms</h2>
            <p>
              RoleSpar reserves the right to update these Terms at any time. We will notify users of
              material changes via email or in-platform notification. Continued use of Spirole after the
              effective date of updated Terms constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-white">13. Contact</h2>
            <p className="mb-1">For questions about these Terms, contact:</p>
            <p className="text-white/50">
              RoleSpar LLC<br />
              <a href="https://rolespar.com" target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:underline">rolespar.com</a><br />
              Wisconsin, USA
            </p>
          </section>

          <p className="border-t border-white/10 pt-6 text-white/40">
            These Terms constitute the entire agreement between you and RoleSpar LLC regarding use of Spirole.
          </p>
        </div>
      </div>
    </div>
  )
}
