import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CommitmentForm from './commitment-form'
import CommitmentsHistory from './commitments-history'
import DashboardNav from '../dashboard-nav'

type RubricDimension = { name: string; weight: number; description: string }
type EvalResult = {
  scores: Record<string, { score: number; rationale: string }>
  rubric_dimensions?: RubricDimension[]
}

function formatDimName(name: string) {
  return name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function barColor(avg: number, isFocus: boolean) {
  if (isFocus) return 'bg-amber-400'
  if (avg >= 7) return 'bg-green-500'
  if (avg >= 4) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default async function ThinkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: subscription } = await supabase.from('subscriptions').select('status').maybeSingle()
  if (!subscription || subscription.status === 'inactive') redirect('/pricing')

  const [{ data: rawSessions }, { data: rawCommitments }] = await Promise.all([
    supabase
      .from('sessions')
      .select('feedback')
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase
      .from('commitments')
      .select('id, prompt, response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // Aggregate dimension scores across all completed sessions
  const dimScores: Record<string, number[]> = {}
  for (const s of rawSessions ?? []) {
    if (!s.feedback) continue
    let ev: EvalResult
    try { ev = JSON.parse(s.feedback as string) as EvalResult } catch { continue }
    for (const d of ev.rubric_dimensions ?? []) {
      const score = ev.scores[d.name]?.score
      if (typeof score === 'number') {
        ;(dimScores[d.name] ??= []).push(score)
      }
    }
  }

  const dimAverages = Object.entries(dimScores)
    .map(([name, scores]) => ({
      name,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => a.avg - b.avg)

  const focusZone = dimAverages[0] ?? null
  const commitments = (rawCommitments ?? []) as {
    id: string; prompt: string; response: string; created_at: string
  }[]

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <DashboardNav email={user.email ?? ''} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Think It Through</h1>
          <p className="mt-1 text-sm text-zinc-500">Reflect on your performance and set a personal focus goal.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left column ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Reflection prompts */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Reflection Prompts</h2>
              <p className="mb-5 text-sm text-zinc-500">
                Pick a prompt, write your response, and save it as your commitment.
              </p>
              <CommitmentForm />
            </div>

            {/* Saved commitments */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Saved Commitments</h2>
              <p className="mb-4 text-sm text-zinc-500">
                {commitments.length === 0
                  ? 'Your saved commitments will appear here.'
                  : 'Click a date to review your commitments from that day.'}
              </p>
              <CommitmentsHistory commitments={commitments} />
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">Average Scores by Dimension</h2>
            <p className="mb-5 text-sm text-zinc-500">
              {dimAverages.length === 0
                ? 'Complete sessions to see your scores.'
                : 'Across all your completed sessions.'}
            </p>

            {dimAverages.length > 0 && (
              <div className="flex flex-col gap-4">
                {focusZone && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Focus Zone</p>
                    <p className="mt-1 text-sm font-semibold text-amber-900">{formatDimName(focusZone.name)}</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      {focusZone.avg.toFixed(1)}/10 — prioritize this next.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {[...dimAverages].sort((a, b) => b.avg - a.avg).map(dim => {
                    const isFocus = focusZone?.name === dim.name
                    return (
                      <div key={dim.name}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`text-xs font-medium leading-tight ${isFocus ? 'text-amber-800' : 'text-zinc-700'}`}>
                            {formatDimName(dim.name)}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-zinc-900">
                            {dim.avg.toFixed(1)}<span className="font-normal text-zinc-400">/10</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full ${barColor(dim.avg, isFocus)}`}
                            style={{ width: `${(dim.avg / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
