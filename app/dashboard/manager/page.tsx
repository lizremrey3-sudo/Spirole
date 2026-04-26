import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import PracticeSelector from '@/app/dashboard/practice-selector'
import AssessmentPanel from '@/app/dashboard/assessment-panel'
import TrendChart from './trend-chart'
import LeadershipScenarios from './leadership-scenarios'
import type { AssessmentContent } from '@/app/actions/assessments'

const ASSOCIATE_TYPES = [
  { key: 'optician',     label: 'Optician' },
  { key: 'technician',  label: 'Technician' },
  { key: 'receptionist', label: 'Receptionist' },
  { key: 'manager',     label: 'Manager' },
] as const

type SessionRow = {
  score: number | string | null
  completed_at: string
  scenarios: { associate_type: string } | { associate_type: string }[] | null
}

function getAssociateType(s: SessionRow): string {
  const sc = Array.isArray(s.scenarios) ? s.scenarios[0] : s.scenarios
  return (sc as { associate_type?: string } | null)?.associate_type ?? 'unknown'
}

function computeWeeklyData(sessions: { score: number; completed_at: string }[]) {
  const now = Date.now()
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const bins = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(now - (4 - i) * msPerWeek)
    const end   = new Date(now - (3 - i) * msPerWeek)
    return {
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      start,
      end,
    }
  })
  const buckets: number[][] = [[], [], [], []]
  for (const s of sessions) {
    const date = new Date(s.completed_at)
    const i = bins.findIndex(b => date >= b.start && date < b.end)
    if (i >= 0) buckets[i].push(s.score)
  }
  return bins.map((b, i) => ({
    label: b.label,
    avg: buckets[i].length
      ? Math.round(buckets[i].reduce((a, v) => a + v, 0) / buckets[i].length)
      : null,
  }))
}

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ practice?: string }>
}) {
  const { practice: practiceParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, practice_id, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role as string)) redirect('/dashboard')

  const tenantId = profile.tenant_id as string
  const role = profile.role as string

  let practices: { id: string; name: string }[] = []
  if (role === 'admin') {
    const { data } = await supabase
      .from('practices')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name')
    practices = data ?? []
  } else {
    const managerPractices: Set<string> = new Set()
    if (profile.practice_id) managerPractices.add(profile.practice_id as string)
    const { data: managed } = await supabase
      .from('practices')
      .select('id, name')
      .eq('manager_id', user.id)
    for (const p of managed ?? []) managerPractices.add(p.id as string)

    if (managerPractices.size > 0) {
      const { data } = await supabase
        .from('practices')
        .select('id, name')
        .in('id', [...managerPractices])
        .order('name')
      practices = data ?? []
    }
  }

  const selectedPracticeId = practiceParam ?? practices[0]?.id ?? null

  let practiceUserIds: string[] = []
  if (selectedPracticeId) {
    const { data: practiceUsers } = await supabase
      .from('users')
      .select('id')
      .eq('practice_id', selectedPracticeId)
      .eq('tenant_id', tenantId)
    practiceUserIds = (practiceUsers ?? []).map(u => u.id as string)
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [sessionsResult, lcScenariosResult, assessmentResult] = await Promise.all([
    practiceUserIds.length > 0
      ? supabase
          .from('sessions')
          .select('score, completed_at, scenarios(associate_type)')
          .in('user_id', practiceUserIds)
          .eq('status', 'completed')
          .gte('completed_at', thirtyDaysAgo)
          .not('score', 'is', null)
      : { data: [] },
    supabase
      .from('scenarios')
      .select('id, title, description')
      .eq('tenant_id', tenantId)
      .eq('session_type', 'leadership_coaching')
      .eq('is_active', true)
      .order('title'),
    selectedPracticeId
      ? supabase
          .from('assessments')
          .select('content, generated_at')
          .eq('tenant_id', tenantId)
          .eq('practice_id', selectedPracticeId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null },
  ])

  const sessions = (sessionsResult.data ?? []) as SessionRow[]
  const lcScenarios = (lcScenariosResult.data ?? []) as {
    id: string; title: string; description: string | null
  }[]
  const cachedAssessment = assessmentResult.data as {
    content: AssessmentContent; generated_at: string
  } | null

  const scoresByType: Record<string, number[]> = {}
  for (const s of sessions) {
    const type = getAssociateType(s)
    const score = Number(s.score)
    if (!isNaN(score) && isFinite(score)) {
      (scoresByType[type] ??= []).push(score)
    }
  }

  const scoredSessions = sessions
    .filter(s => s.score !== null && s.completed_at)
    .map(s => ({ score: Number(s.score), completed_at: s.completed_at }))
  const weeklyData = computeWeeklyData(scoredSessions)

  const selectedPracticeName = practices.find(p => p.id === selectedPracticeId)?.name ?? 'Team'

  function scoreColor(avg: number) {
    if (avg >= 70) return 'text-green-400'
    if (avg >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/manager" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Manager Dashboard</h1>
            <PracticeSelector practices={practices} selectedId={selectedPracticeId} />
          </div>
          <Link
            href="/dashboard/scenarios/new"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            + Create Scenario
          </Link>
        </div>

        {!selectedPracticeId ? (
          <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-12 text-center">
            <p className="text-sm text-white/50">
              No practice assigned yet. Ask your admin to set up your practice in Supabase.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Score cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ASSOCIATE_TYPES.map(({ key, label }) => {
                const scores = scoresByType[key] ?? []
                const avg = scores.length
                  ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                  : null
                return (
                  <div key={key} className="rounded-xl border border-white/10 bg-[#111827] p-5">
                    <p className="text-xs font-medium text-white/50">{label} Scenarios</p>
                    <p className={`mt-1 text-3xl font-bold ${avg !== null ? scoreColor(avg) : 'text-white/30'}`}>
                      {avg ?? '—'}
                      {avg !== null && (
                        <span className="ml-1 text-sm font-normal text-white/40">/100</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {scores.length} session{scores.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Trend + Leadership */}
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
                <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Score Trend</h2>
                <p className="mb-4 text-xs text-white/40">Weekly average — {selectedPracticeName}, last 30 days</p>
                <TrendChart data={weeklyData} />
              </div>

              <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#2dd4bf]">Leadership Coaching</h2>
                    <p className="mt-0.5 text-xs text-white/40">Practice coaching conversations</p>
                  </div>
                </div>
                <LeadershipScenarios scenarios={lcScenarios} />
              </div>
            </div>

            <AssessmentPanel
              practiceId={selectedPracticeId}
              tenantId={tenantId}
              initial={cachedAssessment}
              label="Team"
            />
          </div>
        )}
      </main>
    </div>
  )
}
