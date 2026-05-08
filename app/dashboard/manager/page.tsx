export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import AssessmentPanel from '@/app/dashboard/assessment-panel'
import TrendChart from './trend-chart'
import type { AssessmentContent } from '@/app/actions/assessments'
import { getAssociateTypesForIndustry } from '@/lib/industry-types'

type SessionRow = {
  score: number | string | null
  completed_at: string
  scenarios: { associate_type: string } | { associate_type: string }[] | null
}

type ExternalMetric = {
  source: string
  metric_name: string
  metric_value: number
  recorded_date: string
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

function trendLabel(change: number | null) {
  if (change === null) return null
  if (change > 0) return { text: `+${change.toFixed(1)}`, color: 'text-green-400' }
  if (change < 0) return { text: change.toFixed(1), color: 'text-red-400' }
  return { text: '0', color: 'text-white/40' }
}

function formatMetricName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
  const thirtyDaysAgoDate = thirtyDaysAgo.split('T')[0]

  const [tenantResult, sessionsResult, assessmentResult, externalMetricsResult] = await Promise.all([
    supabase.from('tenants').select('name, industry').eq('id', tenantId).single(),
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
    supabase
      .from('external_metrics')
      .select('source, metric_name, metric_value, recorded_date')
      .eq('tenant_id', tenantId)
      .gte('recorded_date', thirtyDaysAgoDate)
      .order('recorded_date', { ascending: false }),
  ])

  const practiceName = (tenantResult.data?.name as string | null) ?? 'My Practice'
  const tenantIndustry = (tenantResult.data?.industry as string | null) ?? 'optical'
  const ASSOCIATE_TYPES = getAssociateTypesForIndustry(tenantIndustry).map(t => ({ key: t.value, label: t.label }))
  const sessions = (sessionsResult.data ?? []) as SessionRow[]
  const cachedAssessment = assessmentResult.data as { content: AssessmentContent; generated_at: string } | null
  const externalMetrics = (externalMetricsResult.data ?? []) as ExternalMetric[]

  // Training scores by associate type
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

  // Patient Sentiment (Google Reviews)
  const googleMetrics = externalMetrics.filter(m => m.source === 'google_reviews')
  const ratingHistory = googleMetrics.filter(m => m.metric_name === 'star_rating')
  const latestRating = ratingHistory[0]?.metric_value ?? null
  const latestReviewCount = googleMetrics.find(m => m.metric_name === 'review_count')?.metric_value ?? null
  const oldestRating = ratingHistory.length > 1 ? ratingHistory[ratingHistory.length - 1].metric_value : null
  const ratingChange = latestRating !== null && oldestRating !== null ? latestRating - oldestRating : null

  // Other external metrics: group by source + metric_name, latest value per group
  const otherMetrics = externalMetrics.filter(m => m.source !== 'google_reviews')
  const metricGroupMap = new Map<string, { latest: ExternalMetric; oldest: ExternalMetric }>()
  for (const m of otherMetrics) {
    const key = `${m.source}::${m.metric_name}`
    const existing = metricGroupMap.get(key)
    if (!existing) {
      metricGroupMap.set(key, { latest: m, oldest: m })
    } else {
      if (m.recorded_date < existing.oldest.recorded_date) {
        metricGroupMap.set(key, { ...existing, oldest: m })
      }
    }
  }
  const metricGroups = Array.from(metricGroupMap.values())

  const hasExternalData = latestRating !== null || latestReviewCount !== null || metricGroups.length > 0

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/manager" role={profile.role ?? undefined} />

      <main className="mx-auto w-full max-w-6xl flex-1 min-w-0 px-6 py-10">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Manager Dashboard</h1>
            <p className="mt-1 text-sm text-white/50">{practiceName} · last 30 days</p>
          </div>
          <Link
            href="/dashboard/scenarios/new"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            + Create Scenario
          </Link>
        </div>

        <div className="flex flex-col gap-6">

          {/* Team Sessions */}
          <Link
            href="/dashboard/manager/team-sessions"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111827] px-6 py-4 transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-semibold text-white">Team Sessions</p>
              <p className="mt-0.5 text-xs text-white/40">View and filter all completed sessions by team member</p>
            </div>
            <span className="text-sm text-white/30">View all →</span>
          </Link>

          {/* Training score cards */}
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
                    {avg !== null && <span className="ml-1 text-sm font-normal text-white/40">/100</span>}
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

          {/* Real World Impact */}
          <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Real World Impact</h2>
            <p className="mb-5 text-xs text-white/40">External metrics from the last 30 days.</p>

            {!hasExternalData ? (
              <p className="py-4 text-sm text-white/30">
                No external data yet. Configure Google Reviews or connect Zapier in the Admin panel.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* Patient Sentiment card */}
                {(latestRating !== null || latestReviewCount !== null) && (
                  <div className="rounded-xl border border-white/10 bg-[#0a0e1a] p-5">
                    <p className="mb-3 text-xs font-medium text-white/50">Patient Sentiment</p>
                    {latestRating !== null && (
                      <div className="flex items-end gap-1.5">
                        <p className="text-3xl font-bold text-yellow-400">{latestRating.toFixed(1)}</p>
                        <p className="mb-0.5 text-lg text-yellow-400/70">★</p>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3">
                      {latestReviewCount !== null && (
                        <p className="text-xs text-white/40">
                          {Math.round(latestReviewCount).toLocaleString()} reviews
                        </p>
                      )}
                      {ratingChange !== null && (() => {
                        const trend = trendLabel(ratingChange)
                        return trend ? (
                          <p className={`text-xs font-medium ${trend.color}`}>
                            {trend.text} vs 30d ago
                          </p>
                        ) : null
                      })()}
                    </div>
                    <p className="mt-2 text-xs text-white/25">Google Reviews</p>
                  </div>
                )}

                {/* Zapier / other external metric cards */}
                {metricGroups.map(({ latest, oldest }) => {
                  const valueChange = latest.recorded_date !== oldest.recorded_date
                    ? latest.metric_value - oldest.metric_value
                    : null
                  const trend = trendLabel(valueChange)
                  const isPercent = latest.metric_name.includes('rate') || latest.metric_name.includes('percent')
                  const displayValue = isPercent
                    ? `${(latest.metric_value * (latest.metric_value <= 1 ? 100 : 1)).toFixed(1)}%`
                    : latest.metric_value % 1 === 0
                      ? Math.round(latest.metric_value).toLocaleString()
                      : latest.metric_value.toFixed(2)

                  return (
                    <div
                      key={`${latest.source}::${latest.metric_name}`}
                      className="rounded-xl border border-white/10 bg-[#0a0e1a] p-5"
                    >
                      <p className="mb-3 text-xs font-medium text-white/50">
                        {formatMetricName(latest.metric_name)}
                      </p>
                      <p className="text-3xl font-bold text-white">{displayValue}</p>
                      <div className="mt-1 flex items-center gap-3">
                        {trend && (
                          <p className={`text-xs font-medium ${trend.color}`}>
                            {trend.text} vs 30d ago
                          </p>
                        )}
                      </div>
                      <p className="mt-2 text-xs capitalize text-white/25">{latest.source}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
