export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardNav from '@/app/dashboard/dashboard-nav'

// ── Helpers ─────────────────────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Types ────────────────────────────────────────────────────────────────────

type RawSession = {
  id: string
  user_id: string
  score: number | null
  started_at: string
  completed_at: string | null
  scenarios: { title: string } | { title: string }[] | null
}

type RawReaction = {
  session_id: string
  section: string
  reaction: 'up' | 'down'
  tenant_id: string
}

type User = {
  id: string
  full_name: string | null
  email: string | null
  practice_id: string | null
}

type Practice = { id: string; name: string }

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminEngagementPage() {
  const supabase = await createClient()
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const tenantId = profile.tenant_id as string
  const admin = createAdminClient()

  const [sessionsResult, usersResult, practicesResult, reactionsResult] = await Promise.allSettled([
    admin
      .from('sessions')
      .select('id, user_id, score, started_at, completed_at, scenarios(title)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('started_at', { ascending: true }),
    admin
      .from('users')
      .select('id, full_name, email, practice_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    admin
      .from('practices')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name'),
    admin
      .from('session_reactions')
      .select('session_id, section, reaction, tenant_id')
      .eq('tenant_id', tenantId),
  ])

  const sessions: RawSession[] = sessionsResult.status === 'fulfilled'
    ? (sessionsResult.value.data ?? [])
    : []
  const users: User[] = usersResult.status === 'fulfilled'
    ? (usersResult.value.data ?? [])
    : []
  const practices: Practice[] = practicesResult.status === 'fulfilled'
    ? (practicesResult.value.data ?? [])
    : []
  const reactions: RawReaction[] = reactionsResult.status === 'fulfilled'
    ? (reactionsResult.value.data ?? [])
    : []

  // Index for lookups
  const userById = Object.fromEntries(users.map(u => [u.id, u]))
  const practiceById = Object.fromEntries(practices.map(p => [p.id, p]))

  function displayName(u: User) {
    return u.full_name || u.email || u.id.slice(0, 8)
  }

  // ── Metric 1: Score trends per user ────────────────────────────────────────

  const scoredSessions = sessions.filter(s => s.score !== null && s.started_at)
  const sessionsByUser: Record<string, RawSession[]> = {}
  for (const s of scoredSessions) {
    (sessionsByUser[s.user_id] ??= []).push(s)
  }
  // already ordered by started_at from the query

  const scoreTrends = Object.entries(sessionsByUser).map(([userId, userSessions]) => {
    const u = userById[userId]
    return {
      name: u ? displayName(u) : userId.slice(0, 8),
      sessions: userSessions.map((s, i) => {
        const prev = i > 0 ? (userSessions[i - 1].score ?? 0) : null
        const delta = prev !== null ? Math.round((s.score ?? 0) - prev) : null
        return {
          date: fmt(s.started_at),
          score: Math.round(s.score ?? 0),
          delta,
          scenarioTitle: Array.isArray(s.scenarios)
            ? s.scenarios[0]?.title ?? '—'
            : s.scenarios?.title ?? '—',
        }
      }),
    }
  }).sort((a, b) => b.sessions.length - a.sessions.length)

  // ── Metric 2: Time-to-improvement ──────────────────────────────────────────

  const timeToImprovement = Object.entries(sessionsByUser).map(([userId, userSessions]) => {
    const u = userById[userId]
    const name = u ? displayName(u) : userId.slice(0, 8)
    if (userSessions.length < 2) return { name, status: 'Needs more sessions', sessionsToImprove: null, baseline: Math.round(userSessions[0]?.score ?? 0), best: Math.round(userSessions[0]?.score ?? 0) }

    const baseline = userSessions[0].score ?? 0
    const best = Math.max(...userSessions.map(s => s.score ?? 0))
    const THRESHOLD = 10

    const improveIdx = userSessions.findIndex((s, i) => i > 0 && (s.score ?? 0) >= baseline + THRESHOLD)
    if (improveIdx === -1) {
      return { name, status: 'No improvement yet', sessionsToImprove: null, baseline: Math.round(baseline), best: Math.round(best) }
    }
    return { name, status: 'Improved', sessionsToImprove: improveIdx + 1, baseline: Math.round(baseline), best: Math.round(best) }
  }).sort((a, b) => (a.sessionsToImprove ?? 999) - (b.sessionsToImprove ?? 999))

  // ── Metric 3: Sessions per user per week ───────────────────────────────────

  type WeekMap = Record<string, number>
  const weeksByUser: Record<string, WeekMap> = {}
  for (const s of scoredSessions) {
    const week = isoWeek(s.started_at)
    const map = (weeksByUser[s.user_id] ??= {})
    map[week] = (map[week] ?? 0) + 1
  }

  const allWeeks = [...new Set(scoredSessions.map(s => isoWeek(s.started_at)))].sort()

  const sessionFrequency = Object.entries(weeksByUser)
    .map(([userId, weekMap]) => {
      const u = userById[userId]
      const total = Object.values(weekMap).reduce((a, b) => a + b, 0)
      const weeksActive = Object.keys(weekMap).length
      return {
        name: u ? displayName(u) : userId.slice(0, 8),
        total,
        avgPerWeek: weeksActive > 0 ? Math.round((total / weeksActive) * 10) / 10 : 0,
        weekMap,
      }
    })
    .sort((a, b) => b.total - a.total)

  // ── Metric 4: Practice summary ─────────────────────────────────────────────

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const practiceSummary = practices.map(p => {
    const practiceUsers = users.filter(u => u.practice_id === p.id)
    const practiceUserIds = new Set(practiceUsers.map(u => u.id))
    const practiceSessions = scoredSessions.filter(s => practiceUserIds.has(s.user_id))
    const recentSessions = practiceSessions.filter(s => s.started_at >= sevenDaysAgo)
    const scores = practiceSessions.map(s => s.score ?? 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    return { name: p.name, reps: practiceUsers.length, totalSessions: practiceSessions.length, avgScore, recentSessions: recentSessions.length }
  }).sort((a, b) => b.totalSessions - a.totalSessions)

  // Unassigned users
  const unassignedUsers = users.filter(u => !u.practice_id)
  if (unassignedUsers.length > 0) {
    const unassignedIds = new Set(unassignedUsers.map(u => u.id))
    const unassignedSessions = scoredSessions.filter(s => unassignedIds.has(s.user_id))
    const recentUnassigned = unassignedSessions.filter(s => s.started_at >= sevenDaysAgo)
    const scores = unassignedSessions.map(s => s.score ?? 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    practiceSummary.push({ name: 'Unassigned', reps: unassignedUsers.length, totalSessions: unassignedSessions.length, avgScore, recentSessions: recentUnassigned.length })
  }

  // ── Metric 5: Thumbs up/down per section ───────────────────────────────────

  const reactionsBySection: Record<string, { up: number; down: number }> = {}
  for (const r of reactions) {
    const entry = (reactionsBySection[r.section] ??= { up: 0, down: 0 })
    if (r.reaction === 'up') entry.up++
    else entry.down++
  }

  const sectionReactions = Object.entries(reactionsBySection)
    .map(([section, counts]) => {
      const total = counts.up + counts.down
      return { section, up: counts.up, down: counts.down, pctUp: total > 0 ? Math.round((counts.up / total) * 100) : 0 }
    })
    .sort((a, b) => b.up + b.down - (a.up + a.down))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref="/dashboard/tenant" role="admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 min-w-0 px-6 py-10">

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Engagement</h1>
            <p className="mt-1 text-sm text-white/50">Internal admin view · all time</p>
          </div>
          <Link
            href="/dashboard/tenant"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            ← Admin
          </Link>
        </div>

        <div className="flex flex-col gap-8">

          {/* ── Practice Summary ─────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#2dd4bf]">Practice Summary</h2>
            {practiceSummary.length === 0 ? (
              <p className="text-sm text-white/40">No practices configured.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#111827]">
                      <Th>Practice</Th>
                      <Th right>Reps</Th>
                      <Th right>Total Sessions</Th>
                      <Th right>Avg Score</Th>
                      <Th right>Last 7 Days</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {practiceSummary.map((row, i) => (
                      <tr key={row.name} className={i < practiceSummary.length - 1 ? 'border-b border-white/5' : ''}>
                        <Td>{row.name}</Td>
                        <Td right>{row.reps}</Td>
                        <Td right>{row.totalSessions}</Td>
                        <Td right>
                          {row.avgScore !== null
                            ? <span className={scoreColor(row.avgScore)}>{row.avgScore}</span>
                            : <span className="text-white/30">—</span>}
                        </Td>
                        <Td right>{row.recentSessions}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Score Trends ─────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#2dd4bf]">Score Trends per User</h2>
            {scoreTrends.length === 0 ? (
              <p className="text-sm text-white/40">No completed sessions yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#111827]">
                      <Th>User</Th>
                      <Th right>#</Th>
                      <Th>Date</Th>
                      <Th>Scenario</Th>
                      <Th right>Score</Th>
                      <Th right>Δ</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreTrends.flatMap((user, ui) =>
                      user.sessions.map((s, si) => (
                        <tr
                          key={`${ui}-${si}`}
                          className={si < user.sessions.length - 1 || ui < scoreTrends.length - 1 ? 'border-b border-white/5' : ''}
                        >
                          <Td>
                            {si === 0
                              ? <span className="font-medium text-white">{user.name}</span>
                              : <span className="text-white/20">↳</span>}
                          </Td>
                          <Td right><span className="text-white/40">{si + 1}</span></Td>
                          <Td><span className="text-white/60">{s.date}</span></Td>
                          <Td><span className="text-white/50 text-xs">{s.scenarioTitle}</span></Td>
                          <Td right><span className={scoreColor(s.score)}>{s.score}</span></Td>
                          <Td right>
                            {s.delta !== null
                              ? <span className={s.delta > 0 ? 'text-green-400' : s.delta < 0 ? 'text-red-400' : 'text-white/30'}>
                                  {s.delta > 0 ? `+${s.delta}` : s.delta === 0 ? '—' : s.delta}
                                </span>
                              : <span className="text-white/20">—</span>}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Time to Improvement ──────────────────────────────────────── */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Time to Improvement</h2>
            <p className="mb-3 text-xs text-white/40">Sessions until score first rises ≥ 10 points above baseline (session 1)</p>
            {timeToImprovement.length === 0 ? (
              <p className="text-sm text-white/40">No data yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#111827]">
                      <Th>User</Th>
                      <Th right>Baseline</Th>
                      <Th right>Best Score</Th>
                      <Th right>Sessions to Improve</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeToImprovement.map((row, i) => (
                      <tr key={row.name} className={i < timeToImprovement.length - 1 ? 'border-b border-white/5' : ''}>
                        <Td><span className="font-medium text-white">{row.name}</span></Td>
                        <Td right><span className={scoreColor(row.baseline)}>{row.baseline}</span></Td>
                        <Td right><span className={scoreColor(row.best)}>{row.best}</span></Td>
                        <Td right>
                          {row.sessionsToImprove !== null
                            ? <span className="text-white">{row.sessionsToImprove}</span>
                            : <span className="text-white/30">—</span>}
                        </Td>
                        <Td>
                          <span className={
                            row.status === 'Improved'
                              ? 'text-green-400'
                              : row.status === 'Needs more sessions'
                              ? 'text-white/40'
                              : 'text-yellow-400'
                          }>
                            {row.status}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Sessions per Week ─────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#2dd4bf]">Sessions per User per Week</h2>
            {sessionFrequency.length === 0 ? (
              <p className="text-sm text-white/40">No session data yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#111827]">
                      <Th>User</Th>
                      <Th right>Total</Th>
                      <Th right>Avg / Week</Th>
                      {allWeeks.map(w => <Th key={w} right>{w}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionFrequency.map((row, i) => (
                      <tr key={row.name} className={i < sessionFrequency.length - 1 ? 'border-b border-white/5' : ''}>
                        <Td><span className="font-medium text-white">{row.name}</span></Td>
                        <Td right>{row.total}</Td>
                        <Td right>{row.avgPerWeek}</Td>
                        {allWeeks.map(w => (
                          <Td key={w} right>
                            <span className={row.weekMap[w] ? 'text-white' : 'text-white/20'}>
                              {row.weekMap[w] ?? '—'}
                            </span>
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Thumbs Up/Down ────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Evaluation Section Reactions</h2>
            <p className="mb-3 text-xs text-white/40">Thumbs up / down recorded by users per evaluation dimension</p>
            {sectionReactions.length === 0 ? (
              <p className="text-sm text-white/40">No reactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#111827]">
                      <Th>Section</Th>
                      <Th right>👍</Th>
                      <Th right>👎</Th>
                      <Th right>Total</Th>
                      <Th right>% Positive</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionReactions.map((row, i) => (
                      <tr key={row.section} className={i < sectionReactions.length - 1 ? 'border-b border-white/5' : ''}>
                        <Td><span className="font-medium text-white">{row.section}</span></Td>
                        <Td right><span className="text-green-400">{row.up}</span></Td>
                        <Td right><span className="text-red-400">{row.down}</span></Td>
                        <Td right>{row.up + row.down}</Td>
                        <Td right>
                          <span className={row.pctUp >= 70 ? 'text-green-400' : row.pctUp >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                            {row.pctUp}%
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}

// ── Table cell helpers ────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-medium text-white/50 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-4 py-3 text-white/70 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </td>
  )
}
