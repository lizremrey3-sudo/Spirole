import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import TeamSessionsClient from './team-sessions-client'

type RawSession = {
  id: string
  score: number | string | null
  completed_at: string
  user_id: string
  users: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
  scenarios: { title: string; associate_type: string } | { title: string; associate_type: string }[] | null
}

function getUser(s: RawSession) {
  const u = Array.isArray(s.users) ? s.users[0] : s.users
  return { full_name: u?.full_name ?? null, email: u?.email ?? null }
}

function getScenario(s: RawSession) {
  const sc = Array.isArray(s.scenarios) ? s.scenarios[0] : s.scenarios
  return { title: sc?.title ?? 'Session', associate_type: sc?.associate_type ?? 'unknown' }
}

export default async function TeamSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role as string)) redirect('/dashboard')
  if ((profile as { is_active?: boolean }).is_active === false) redirect('/deactivated')

  const tenantId = profile.tenant_id as string

  const [sessionsResult, membersResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, score, completed_at, user_id, users(full_name, email), scenarios(title, associate_type)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId),
  ])

  const raw = (sessionsResult.data ?? []) as RawSession[]
  const sessions = raw.map(s => {
    const u = getUser(s)
    const sc = getScenario(s)
    const num = s.score != null ? Number(s.score) : null
    return {
      id: s.id,
      score: num !== null && isFinite(num) ? num : null,
      completed_at: s.completed_at,
      user_id: s.user_id,
      userName: u.full_name ?? '',
      userEmail: u.email ?? '',
      scenarioTitle: sc.title,
      associateType: sc.associate_type,
    }
  })

  const memberIds = new Set(sessions.map(s => s.user_id))
  const members = (membersResult.data ?? [])
    .filter(m => memberIds.has(m.id as string))
    .map(m => ({ id: m.id as string, name: (m.full_name as string | null) || (m.email as string | null) || 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/manager" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Team Sessions</h1>
            <p className="mt-1 text-sm text-white/50">All completed sessions across your team</p>
          </div>
          <Link
            href="/dashboard/manager"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            ← Manager Dashboard
          </Link>
        </div>

        <TeamSessionsClient sessions={sessions} members={members} />
      </main>
    </div>
  )
}
