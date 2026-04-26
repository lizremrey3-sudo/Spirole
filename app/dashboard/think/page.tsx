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
  if (avg >= 7) return 'bg-[#2dd4bf]'
  if (avg >= 4) return 'bg-yellow-400'
  return 'bg-red-400'
}

const HERO_IMAGE =
  'https://nhkjcgmnetmmikwalhtl.supabase.co/storage/v1/object/public/photo-backgrounds/Elegant%20ascent%20in%20historic%20building.png'

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
    <div className="flex min-h-full flex-col bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} />

      {/* Hero */}
      <div className="relative h-52 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        <div className="absolute inset-0 bg-[#0a0e1a]/65" />
        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-6 pb-8">
          <h1 className="text-3xl font-bold text-white">Think It Through</h1>
          <p className="mt-1 text-sm text-white/60">Reflect on your performance and set a personal focus goal.</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* Reflection prompts */}
            <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
              <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Reflection Prompts</h2>
              <p className="mb-5 text-sm text-white/50">
                Pick a prompt, write your response, and save it as your commitment.
              </p>
              <CommitmentForm />
            </div>

            {/* Saved commitments */}
            <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
              <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Saved Commitments</h2>
              <p className="mb-4 text-sm text-white/50">
                {commitments.length === 0
                  ? 'Your saved commitments will appear here.'
                  : 'Click a date to review your commitments from that day.'}
              </p>
              <CommitmentsHistory commitments={commitments} />
            </div>
          </div>

          {/* Right column */}
          <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Average Scores by Dimension</h2>
            <p className="mb-5 text-sm text-white/50">
              {dimAverages.length === 0
                ? 'Complete sessions to see your scores.'
                : 'Across all your completed sessions.'}
            </p>

            {dimAverages.length > 0 && (
              <div className="flex flex-col gap-4">
                {focusZone && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Focus Zone</p>
                    <p className="mt-1 text-sm font-semibold text-amber-200">{formatDimName(focusZone.name)}</p>
                    <p className="mt-0.5 text-xs text-amber-400/80">
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
                          <span className={`text-xs font-medium leading-tight ${isFocus ? 'text-amber-300' : 'text-white/70'}`}>
                            {formatDimName(dim.name)}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-white">
                            {dim.avg.toFixed(1)}<span className="font-normal text-white/40">/10</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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
