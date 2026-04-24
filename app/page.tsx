import Link from 'next/link'

const LOGO_URL = 'https://nhkjcgmnetmmikwalhtl.supabase.co/storage/v1/object/public/Photo%20Backgrounds/Elegant%20silver%20spiral%20staircase%20logo.png'

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a] text-white">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-widest text-white/80">SPIROLE</span>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-sm text-white/40 transition-colors hover:text-white/80">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-[#0a0e1a] transition-all hover:bg-teal-300 hover:shadow-[0_0_20px_rgba(45,212,191,0.35)]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-32 pt-20 text-center">

        {/* Background atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-teal-400/[0.05] blur-[140px]" />
          <div className="absolute left-1/2 top-24 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-teal-400/[0.08] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-4xl">

          {/* Logo — centered, large, with glow */}
          <div className="relative mb-12 flex justify-center">
            <div className="absolute inset-x-0 top-1/2 h-48 -translate-y-1/2 rounded-full bg-teal-400/20 blur-[70px]" />
            <img
              src={LOGO_URL}
              alt="Spirole"
              className="relative h-36 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 40px rgba(45,212,191,0.55)) drop-shadow(0 0 12px rgba(45,212,191,0.3))' }}
            />
          </div>

          {/* Label */}
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-teal-400">
            For Optical Teams
          </p>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
            Communication Training<br className="hidden sm:block" />{' '}
            for Optical Teams
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-white/45">
            Made by optical professionals. Powered by AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-lg bg-teal-400 px-9 py-3.5 text-sm font-semibold text-[#0a0e1a] transition-all hover:bg-teal-300 hover:shadow-[0_0_28px_rgba(45,212,191,0.4)]"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-white/[0.12] px-9 py-3.5 text-sm font-semibold text-white/70 transition-all hover:border-white/25 hover:text-white"
            >
              See Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quote cards ─────────────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">

          <blockquote className="relative rounded-2xl border border-teal-400/[0.18] bg-white/[0.02] p-8 transition-colors hover:border-teal-400/30">
            <div className="mb-5 h-px w-10 bg-teal-400" />
            <p className="text-[0.95rem] italic leading-[1.75] text-white/60">
              "The text sessions build critical thinking and vocabulary. The vocal sessions make the
              language feel natural. The weekly discussion makes the learning stick. Together, they
              create a training loop that doesn't end when the tab closes."
            </p>
          </blockquote>

          <blockquote className="relative rounded-2xl border border-teal-400/[0.18] bg-white/[0.02] p-8 transition-colors hover:border-teal-400/30">
            <div className="mb-5 h-px w-10 bg-teal-400" />
            <p className="text-[0.95rem] italic leading-[1.75] text-white/60">
              "Most training assumes the problem is knowledge. Spirole assumes the problem is
              knowledge retention and application under pressure."
            </p>
          </blockquote>

        </div>
      </section>

      {/* ── Tagline ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-white/[0.06] px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/[0.04] blur-[100px]" />
        </div>
        <div className="relative">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-teal-400">
            The next step
          </p>
          <h2 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            It's time to{' '}
            <span className="text-teal-400">Spiral Up.</span>
          </h2>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-teal-400">
            What you get
          </p>
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything your team needs to improve
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">

            {/* AI Roleplay */}
            <div className="group rounded-2xl border border-teal-400/[0.15] bg-white/[0.02] p-8 transition-all hover:border-teal-400/30 hover:bg-white/[0.04]">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10">
                <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.122v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V10.633c0-.994.616-1.838 1.5-2.122m15-3.011H4.5a2.25 2.25 0 0 0-2.25 2.25v.75m19.5 0v-.75a2.25 2.25 0 0 0-2.25-2.25m0 0h-15m15 0H9m-9 3h3.75m0 0h6.75M3.75 12h16.5M3.75 15h16.5M3.75 18h16.5" />
                </svg>
              </div>
              <h3 className="mb-2.5 text-base font-semibold text-white">AI Roleplay Practice</h3>
              <p className="text-sm leading-relaxed text-white/45">
                Practice real conversations with AI-powered patient and team personas — any time, as many times as you need.
              </p>
            </div>

            {/* Vocal Delivery */}
            <div className="group rounded-2xl border border-teal-400/[0.15] bg-white/[0.02] p-8 transition-all hover:border-teal-400/30 hover:bg-white/[0.04]">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10">
                <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </div>
              <h3 className="mb-2.5 text-base font-semibold text-white">Vocal Delivery Scoring</h3>
              <p className="text-sm leading-relaxed text-white/45">
                Go beyond reading scripts. Get scored on how you say it — tone, clarity, and confidence that builds over time.
              </p>
            </div>

            {/* Manager Insights */}
            <div className="group rounded-2xl border border-teal-400/[0.15] bg-white/[0.02] p-8 transition-all hover:border-teal-400/30 hover:bg-white/[0.04]">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10">
                <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              <h3 className="mb-2.5 text-base font-semibold text-white">Manager Insights</h3>
              <p className="text-sm leading-relaxed text-white/45">
                See your team's progress at a glance. Identify coaching opportunities and track improvement across every rep.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-teal-400/20 p-14 text-center">
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 -top-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-teal-400/[0.07] blur-[80px]" />
          </div>
          <div className="relative">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to level up your team?
            </h2>
            <p className="mb-8 text-white/45">Start practicing today. No credit card required.</p>
            <Link
              href="/sign-up"
              className="inline-block rounded-lg bg-teal-400 px-9 py-3.5 text-sm font-semibold text-[#0a0e1a] transition-all hover:bg-teal-300 hover:shadow-[0_0_28px_rgba(45,212,191,0.4)]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xs font-semibold tracking-widest text-white/25">SPIROLE</span>
          <div className="flex items-center gap-8 text-sm text-white/30">
            <Link href="/pricing" className="transition-colors hover:text-white/70">Pricing</Link>
            <Link href="/sign-in" className="transition-colors hover:text-white/70">Sign In</Link>
            <Link href="/tos" className="transition-colors hover:text-white/70">Terms of Service</Link>
          </div>
          <p className="text-xs text-white/20">© {new Date().getFullYear()} Spirole</p>
        </div>
      </footer>

    </div>
  )
}
