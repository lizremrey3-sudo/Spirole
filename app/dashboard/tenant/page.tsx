import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import AssessmentPanel from '@/app/dashboard/assessment-panel'
import PracticeTrendChart from './practice-trend-chart'
import type { AssessmentContent } from '@/app/actions/assessments'

function computeWeekBins() {
  const now = Date.now()
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Array.from({ length: 4 }, (_, i) => {
    const start = new Date(now - (4 - i) * msPerWeek)
    const end   = new Date(now - (3 - i) * msPerWeek)
    return { label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start, end }
  })
}

function scoreColor(avg: number) {
  if (avg >= 70) return 'text-green-700'
  if (avg >= 40) return 'text-yellow-700'
  return 'text-red-700'
}

export default async function TenantDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const tenantId = profile.tenant_id as string
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [practicesResult, usersResult, sessionsResult, assessmentResult] = await Promise.all([
    supabase.from('practices').select('id, name, manager_id').eq('tenant_id', tenantId).order('name'),
    supabase.from('users').select('id, practice_id').eq('tenant_id', tenantId),
    supabase
      .from('sessions')
      .select('user_id, score, completed_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo)
      .not('score', 'is', null),
    supabase
      .from('assessments')
      .select('content, generated_at')
      .eq('tenant_id', tenantId)
      .is('practice_id', null)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const practices  = (practicesResult.data ?? []) as { id: string; name: string; manager_id: string | null }[]
  const allUsers   = (usersResult.data ?? []) as { id: string; practice_id: string | null }[]
  const allSessions = (sessionsResult.data ?? []) as { user_id: string; score: string | number; completed_at: string }[]
  const cachedAssessment = assessmentResult.data as { content: AssessmentContent; generated_at: string } | null

  // Map user_id → practice_id
  const userPractice: Record<string, string> = {}
  for (const u of allUsers) {
    if (u.practice_id) userPractice[u.id] = u.practice_id
  }

  const bins = computeWeekBins()

  // Per-practice stats
  const practiceStats = practices.map(p => {
    const pSessions = allSessions.filter(s => userPractice[s.user_id] === p.id)
    const scores = pSessions.map(s => Number(s.score)).filter(isFinite)

    const weeklyAvgs = bins.map(b => {
      const binScores = pSessions
        .filter(s => {
          const d = new Date(s.completed_at)
          return d >= b.start && d < b.end
        })
        .map(s => Number(s.score))
        .filter(isFinite)
      return binScores.length
        ? Math.round(binScores.reduce((a, v) => a + v, 0) / binScores.length)
        : null
    })

    return {
      id: p.id,
      name: p.name,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      sessionCount: pSessions.length,
      weeklyAvgs,
    }
  })

  const weekLabels = bins.map(b => b.label)

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/tenant" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Tenant Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {practices.length} practice{practices.length !== 1 ? 's' : ''} · last 30 days
          </p>
        </div>

        {practices.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">No practices yet. Add them in Supabase to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Practice score cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {practiceStats.map(p => (
                <Link
                  key={p.id}
                  href={`/dashboard/manager?practice=${p.id}`}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-sm"
                >
                  <p className="mb-1 text-xs font-medium text-zinc-500 truncate">{p.name}</p>
                  <p className={`text-3xl font-bold ${p.avg !== null ? scoreColor(p.avg) : 'text-zinc-300'}`}>
                    {p.avg ?? '—'}
                    {p.avg !== null && <span className="ml-1 text-sm font-normal text-zinc-400">/100</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {p.sessionCount} session{p.sessionCount !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    View practice →
                  </p>
                </Link>
              ))}
            </div>

            {/* Multi-line trend chart */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Practice Score Trends</h2>
              <p className="mb-4 text-xs text-zinc-400">Weekly average per practice — last 30 days</p>
              {practiceStats.some(p => p.weeklyAvgs.some(v => v !== null)) ? (
                <PracticeTrendChart
                  practices={practiceStats.map(p => ({ id: p.id, name: p.name, weeklyAvgs: p.weeklyAvgs }))}
                  weekLabels={weekLabels}
                />
              ) : (
                <p className="py-8 text-center text-sm text-zinc-400">No session data in this period.</p>
              )}
            </div>

            {/* Assessment */}
            <AssessmentPanel
              practiceId={null}
              tenantId={tenantId}
              initial={cachedAssessment}
              label="Tenant"
            />
          </div>
        )}
      </main>
    </div>
  )
}
