import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import AssessmentPanel from '@/app/dashboard/assessment-panel'
import PracticeTrendChart from './practice-trend-chart'
import TeamPanel from './team-panel'
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
  if (avg >= 70) return 'text-green-400'
  if (avg >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

const ASSOCIATE_TYPES = [
  { key: 'optician',     label: 'Optician' },
  { key: 'technician',   label: 'Technician' },
  { key: 'receptionist', label: 'Receptionist' },
  { key: 'manager',      label: 'Manager' },
] as const

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
  if ((profile as { is_active?: boolean } | null)?.is_active === false) redirect('/deactivated')

  const tenantId = profile.tenant_id as string
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [tenantResult, sessionsResult, assessmentResult, membersResult, practicesResult, invitationsResult] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', tenantId).single(),
    supabase
      .from('sessions')
      .select('score, completed_at, scenarios(associate_type)')
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
    createAdminClient()
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    supabase
      .from('practices')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
    supabase
      .from('invitations')
      .select('id, email, role, practice_name, created_at')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const practiceName = (tenantResult.data?.name as string | null) ?? 'My Practice'

  type RawMember = { id: string; full_name: string | null; email: string | null; role: string; is_active: boolean }
  const teamMembers = ((membersResult.data ?? []) as RawMember[]).map(m => ({
    ...m,
    is_active: m.is_active !== false,
    practices: null,
  }))
  const practices = (practicesResult.data ?? []) as { id: string; name: string }[]
  type PendingInvite = { id: string; email: string; role: string; practice_name: string | null; created_at: string }
  const pendingInvites = (invitationsResult.data ?? []) as PendingInvite[]
  const allSessions = (sessionsResult.data ?? []) as {
    score: string | number
    completed_at: string
    scenarios: { associate_type: string } | { associate_type: string }[] | null
  }[]
  const cachedAssessment = assessmentResult.data as { content: AssessmentContent; generated_at: string } | null

  const bins = computeWeekBins()

  // Overall stats
  const allScores = allSessions.map(s => Number(s.score)).filter(isFinite)
  const overallAvg = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null

  // Score cards by associate type
  const scoresByType: Record<string, number[]> = {}
  for (const s of allSessions) {
    const sc = Array.isArray(s.scenarios) ? s.scenarios[0] : s.scenarios
    const type = (sc as { associate_type?: string } | null)?.associate_type ?? 'unknown'
    const score = Number(s.score)
    if (isFinite(score)) (scoresByType[type] ??= []).push(score)
  }

  // Weekly trend
  const weeklyAvgs = bins.map(b => {
    const binScores = allSessions
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

  const weekLabels = bins.map(b => b.label)

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/tenant" role="admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{practiceName}</h1>
            <p className="mt-1 text-sm text-white/50">Last 30 days · admin view</p>
          </div>
          <Link
            href="/dashboard/manager/team-sessions"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Team Sessions
          </Link>
        </div>

        <div className="flex flex-col gap-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#111827] p-5">
              <p className="text-xs font-medium text-white/50">Overall Avg</p>
              <p className={`mt-1 text-3xl font-bold ${overallAvg !== null ? scoreColor(overallAvg) : 'text-white/30'}`}>
                {overallAvg ?? '—'}
                {overallAvg !== null && <span className="ml-1 text-sm font-normal text-white/40">/100</span>}
              </p>
              <p className="mt-0.5 text-xs text-white/40">{allScores.length} session{allScores.length !== 1 ? 's' : ''}</p>
            </div>

            {ASSOCIATE_TYPES.map(({ key, label }) => {
              const scores = scoresByType[key] ?? []
              const avg = scores.length
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-[#111827] p-5">
                  <p className="text-xs font-medium text-white/50">{label}</p>
                  <p className={`mt-1 text-3xl font-bold ${avg !== null ? scoreColor(avg) : 'text-white/30'}`}>
                    {avg ?? '—'}
                    {avg !== null && <span className="ml-1 text-sm font-normal text-white/40">/100</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">{scores.length} session{scores.length !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
          </div>

          {/* Trend chart */}
          <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Score Trend</h2>
            <p className="mb-4 text-xs text-white/40">Weekly average — last 30 days</p>
            {weeklyAvgs.some(v => v !== null) ? (
              <PracticeTrendChart
                practices={[{ id: tenantId, name: practiceName, weeklyAvgs }]}
                weekLabels={weekLabels}
              />
            ) : (
              <p className="py-8 text-center text-sm text-white/40">No session data in this period.</p>
            )}
          </div>

          <AssessmentPanel
            practiceId={null}
            tenantId={tenantId}
            initial={cachedAssessment}
            label="Practice"
          />

          <TeamPanel
            initialMembers={teamMembers}
            practices={practices}
            currentUserId={user.id}
            initialPendingInvites={pendingInvites}
          />
        </div>
      </main>
    </div>
  )
}
