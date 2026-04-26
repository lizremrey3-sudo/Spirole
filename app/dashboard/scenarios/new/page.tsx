import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import ScenarioForm from './scenario-form'

export default async function NewScenarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-6 py-4">
        <span className="text-sm font-semibold tracking-tight text-white">Spirole</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/70"
        >
          ← Back to dashboard
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-2xl font-semibold text-white">New Scenario</h1>
          <p className="mt-1 text-sm text-white/50">Create a training scenario for your team.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-6">
          <ScenarioForm />
        </div>
      </main>
    </div>
  )
}
