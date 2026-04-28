export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import AssessmentPanel from '@/app/dashboard/assessment-panel'
import TrendChart from './trend-chart'
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

function scoreColor(avg: number) {
  if (avg >= 70) return 'text-green-400'
  if (avg >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export default async function ManagerDashboard() {
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [tenantResult, sessionsResult, assessmentResult] = await Promise.all([
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
  ])

  const practiceName = (tenantResult.data?.name as string | null) ?? 'My Practice'
  const sessions = (sessionsResult.data ?? []) as SessionRow[]
  const cachedAssessment = assessmentResult.data as {
    content: AssessmentContent; generated_at: string
  } | null

  // Score cards by associate type
  const scoresByType: Record<string, number[]> = {}
  for (const s of sessions) {
    const type = getAssociateType(s)
    const score = Number(s.score)
    if (!isNaN(score) && isFinite(score)) {
      (scoresByType[type] ??= []).push(score)
    }
  }

  // Weekly trend
  const scoredSessions = sessions
    .filter(s => s.score !== null && s.completed_at)
    .map(s => ({ score: Number(s.score), completed_at: s.completed_at }))
  const weeklyData = computeWeeklyData(scoredSessions)

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/manager" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Manager Dashboard</h1>
            <p className="mt-1 text-sm text-white/50">{practiceName} · last 30 days</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/manager/team-sessions"
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Team Sessions
            </Link>
            <Link
              href="/dashboard/scenarios/new"
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              + Create Scenario
            </Link>
          </div>
        </div>

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

          {/* Trend chart */}
          <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Score Trend</h2>
            <p className="mb-4 text-xs text-white/40">Weekly average — {practiceName}, last 30 days</p>
            <TrendChart data={weeklyData} />
          </div>

          <AssessmentPanel
            practiceId={null}
            tenantId={tenantId}
            initial={cachedAssessment}
            label="Team"
          />
        </div>
      </main>
    </div>
  )
}
