import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import ImportClient from './import-client'

export default async function ImportScenariosPage() {
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
    <div className="flex min-h-full flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Spirole</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← Back to dashboard
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-2xl font-semibold text-zinc-900">Import Scenarios</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a CSV file to bulk-create scenarios. Review the preview before confirming.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-6">
          <ImportClient />
        </div>
      </main>
    </div>
  )
}
