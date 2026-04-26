import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ScoreChart from './score-chart'
import DashboardNav from '../dashboard-nav'

type EvalResult = {
  scores: Record<string, { score: number; rationale: string }>
  overall_feedback: string
  rubric_dimensions?: { name: string; weight: number; description: string }[]
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-green-400 bg-green-500/10'
  if (s >= 40) return 'text-yellow-400 bg-yellow-500/10'
  return 'text-red-400 bg-red-500/10'
}

export default async function AssociatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: subscription } = await supabase.from('subscriptions').select('status').maybeSingle()
  if (!subscription || subscription.status === 'inactive') redirect('/pricing')

  const { data: raw } = await supabase
    .from('sessions')
    .select('id, score, feedback, completed_at, scenarios(title)')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: true })

  const sessions = (raw ?? []).map(s => {
    const scenarioRaw = Array.isArray(s.scenarios) ? s.scenarios[0] : s.scenarios
    const title = (scenarioRaw as { title?: string } | null)?.title ?? 'Session'
    const num = s.score != null ? Number(s.score) : null
    const score = num !== null && isFinite(num) ? Math.round(num) : null
    let evaluation: EvalResult | null = null
    if (s.feedback) {
      try { evaluation = JSON.parse(s.feedback as string) as EvalResult } catch {}
    }
    return { id: s.id as string, score, completedAt: s.completed_at as string, title, evaluation }
  })

  const chartData = sessions
    .filter(s => s.score !== null)
    .map(s => ({ score: s.score as number, date: s.completedAt, label: s.title }))

  const displaySessions = [...sessions].reverse()

  return (
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Sessions</h1>
            <p className="mt-1 text-sm text-white/50">
              {sessions.length === 0
                ? 'No completed sessions yet.'
                : `${sessions.length} completed session${sessions.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80"
          >
            Start New Session
          </Link>
        </div>

        {chartData.length > 0 && (
          <div className="mb-8">
            <ScoreChart data={chartData} />
          </div>
        )}

        {displaySessions.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-12 text-center">
            <p className="text-sm text-white/50">
              Complete a session to see your history here.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] hover:bg-[#2dd4bf]/80"
            >
              Start a Session
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displaySessions.map(session => (
              <Link
                key={session.id}
                href={`/dashboard/session/${session.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111827] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{session.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {new Date(session.completedAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                {session.score !== null ? (
                  <span className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${scoreColor(session.score)}`}>
                    {session.score}
                    <span className="ml-0.5 text-xs font-normal opacity-60">/100</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-white/40">—</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
