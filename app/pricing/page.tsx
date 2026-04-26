import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PromoCodeForm from './promo-code-form'

const PLANS = [
  {
    id: 'entry',
    name: 'Entry Point',
    tagline: 'Get your team started with AI-powered role play.',
    features: [
      'Unlimited training sessions',
      'Standard scenarios library',
      'Basic performance reports',
      'Up to 5 team members',
    ],
    baseHref: 'https://buy.stripe.com/7sY3cvbQofyE2HN12C8ww00',
    highlighted: false,
  },
  {
    id: 'strategist',
    name: 'Strategist Plan',
    tagline: 'Advanced coaching tools for growth-focused teams.',
    features: [
      'Everything in Entry Point',
      'Custom scenario builder',
      'Detailed coaching feedback',
      'Manager dashboards',
      'Up to 20 team members',
    ],
    baseHref: 'https://buy.stripe.com/6oUdR907GfyEgyDh1A8ww01',
    highlighted: true,
  },
  {
    id: 'elite',
    name: 'Elite Plan',
    tagline: 'Full-service training for enterprise sales teams.',
    features: [
      'Everything in Strategist',
      'Unlimited team members',
      'Custom personas & rubrics',
      'Priority support',
      'Dedicated onboarding',
    ],
    baseHref: 'https://buy.stripe.com/cNi4gzg6EcmscinaDc8ww02',
    highlighted: false,
  },
] as const

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let tenantId: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    tenantId = profile?.tenant_id ?? null
  }

  function planHref(planId: string, baseHref: string) {
    if (!tenantId) return baseHref
    return `${baseHref}?client_reference_id=${tenantId}:${planId}`
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Spirole
        </Link>
        {user ? (
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">
            Go to dashboard →
          </Link>
        ) : (
          <div className="flex gap-3">
            <Link href="/sign-in" className="text-sm text-white/50 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-[#2dd4bf] px-3 py-1.5 text-sm font-medium text-[#0a0e1a] hover:bg-[#2dd4bf]/80"
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Choose your plan
          </h1>
          <p className="mt-3 text-white/50">
            {user
              ? 'Select a plan to activate your account, or enter a promo code below.'
              : 'Start training your sales team with AI-powered role play.'}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? 'border-[#2dd4bf]/40 bg-[#2dd4bf]/5'
                  : 'border-white/10 bg-[#111827]'
              }`}
            >
              <div className="mb-6">
                <h2 className={`text-lg font-semibold ${plan.highlighted ? 'text-[#2dd4bf]' : 'text-white'}`}>
                  {plan.name}
                </h2>
                <p className={`mt-1 text-sm ${plan.highlighted ? 'text-white/60' : 'text-white/50'}`}>
                  {plan.tagline}
                </p>
              </div>

              <ul className="mb-8 flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="mt-0.5 shrink-0 text-[#2dd4bf]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={planHref(plan.id, plan.baseHref)}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-[#2dd4bf] text-[#0a0e1a] hover:bg-[#2dd4bf]/80'
                    : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Get started
              </a>
            </div>
          ))}
        </div>

        {user && (
          <div className="mx-auto mt-12 max-w-md">
            <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
              <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">
                Have a promo code?
              </h2>
              <p className="mb-4 text-sm text-white/50">
                Pilot codes grant immediate free access. Discount codes apply at Stripe checkout.
              </p>
              <PromoCodeForm />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
