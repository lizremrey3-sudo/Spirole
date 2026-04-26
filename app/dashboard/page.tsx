import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ScenariosPanel from './scenarios-panel'
import InviteForm from './invite-form'
import DashboardNav from './dashboard-nav'

const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Manager',
  rep:     'Rep',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const [{ data: profile }, { data: scenarios }, { data: subscription }] = await Promise.all([
    supabase.from('users').select('full_name, role').eq('id', user.id).single(),
    supabase.from('scenarios').select('id, title, description, associate_type').eq('is_active', true),
    supabase.from('subscriptions').select('status').maybeSingle(),
  ])

  if (!subscription || subscription.status === 'inactive') redirect('/pricing')

  if (profile?.role === 'admin')   redirect('/dashboard/tenant')
  if (profile?.role === 'manager') redirect('/dashboard/manager')

  const displayName = profile?.full_name || user.email || 'there'
  const roleLabel = ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? ''

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              Welcome back, {displayName}
            </h1>
            {roleLabel && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
                {roleLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/50">Choose a role to start a training session.</p>
        </div>

        <div className="mb-8 flex gap-3">
          <Link
            href="/dashboard/associate"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            My Sessions
          </Link>
          <Link
            href="/dashboard/think"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Think It Through
          </Link>
        </div>

        <ScenariosPanel scenarios={scenarios ?? []} />

        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <div className="mt-10">
            <InviteForm />
          </div>
        )}
      </main>
    </div>
  )
}
