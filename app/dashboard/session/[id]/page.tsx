import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signOut } from '@/app/actions/auth'
import { abandonSession } from '@/app/actions/sessions'
import ChatInterface from './chat-interface'
import VocalDeliveryPanel from './vocal-delivery-panel'
import HumeAutoTrigger from './hume-auto-trigger'

type PersonaJson = Record<string, unknown>
type RubricDimension = { name: string; weight: number; description: string }
type RubricJson = { dimensions?: RubricDimension[] }

type VocalDeliveryScores = {
  confidence: number
  warmth: number
  hesitation: number
  enthusiasm: number
}

type EvalScores = Record<string, { score: number; rationale: string }>
type EvalResult = {
  scores: EvalScores
  overall_feedback: string
  strengths: string[]
  improvements: string[]
  rubric_dimensions?: RubricDimension[]
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ resumed?: string }>
}) {
  const { id } = await params
  const { resumed } = await searchParams
  const isResumed = resumed === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const [sessionResult, messagesResult, audioCheck] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, status, score, feedback, started_at, completed_at, scenarios(title, description, persona, rubric)')
      .eq('id', id)
      .single(),
    supabase
      .from('session_messages')
      .select('id, role, content, created_at')
      .eq('session_id', id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true }),
    admin.storage.from('session-audio').list('', { search: id }),
  ])

  if (sessionResult.error || !sessionResult.data) redirect('/dashboard')

  const session = sessionResult.data
  const messages = (messagesResult.data ?? []) as { id: string; role: 'user' | 'assistant'; content: string; created_at: string }[]

  const scenarioRaw = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios
  const scenarioTitle = (scenarioRaw?.title as string | undefined) ?? 'Training Session'
  const persona = (scenarioRaw?.persona ?? {}) as PersonaJson
  const rubric = (scenarioRaw?.rubric ?? {}) as RubricJson
  const personaName = typeof persona.name === 'string' ? persona.name : 'AI'
  const userTurns = messages.filter(m => m.role === 'user').length

  const isCompleted = session.status === 'completed'

  let evaluation: EvalResult | null = null
  let vocalDelivery: VocalDeliveryScores | null = null
  if (isCompleted && session.feedback) {
    try {
      const parsed = JSON.parse(session.feedback as string) as EvalResult & { vocal_delivery?: VocalDeliveryScores }
      evaluation = parsed
      vocalDelivery = parsed.vocal_delivery ?? null
    } catch {
      evaluation = null
    }
  }

  const hasAudio = (audioCheck.data ?? []).some(f => f.name === `${id}.webm`)

  return (
    <div className="flex h-screen flex-col bg-[#0a0e1a]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111827] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-white hover:text-white/70">
            Spirole
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-sm text-white/60">{scenarioTitle}</span>
          {isCompleted && (
            <span className="rounded-full bg-[#2dd4bf]/10 px-2.5 py-0.5 text-xs font-medium text-[#2dd4bf]">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">{user.email}</span>
          {!isCompleted && (
            <form action={abandonSession}>
              <input type="hidden" name="sessionId" value={id} />
              <button
                type="submit"
                className="text-sm text-white/40 transition-colors hover:text-red-400"
              >
                Abandon session
              </button>
            </form>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {isResumed && !isCompleted && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5">
          <p className="text-sm text-amber-400">
            Resuming your previous session
            {session.started_at ? (
              <> — started{' '}
                {new Date(session.started_at as string).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </>
            ) : null}
          </p>
        </div>
      )}

      {isCompleted ? (
        <ResultsView
          score={session.score as number | null}
          evaluation={evaluation}
          rubric={rubric}
          personaName={personaName}
          messages={messages}
          sessionId={id}
          vocalDelivery={vocalDelivery}
          hasAudio={hasAudio}
        />
      ) : (
        <ChatInterface
          sessionId={id}
          initialMessages={messages}
          personaName={personaName}
          userMessageCount={userTurns}
        />
      )}
    </div>
  )
}

function ResultsView({
  score,
  evaluation,
  rubric,
  personaName,
  messages,
  sessionId,
  vocalDelivery,
  hasAudio,
}: {
  score: number | null
  evaluation: EvalResult | null
  rubric: RubricJson
  personaName: string
  messages: { id: string; role: 'user' | 'assistant'; content: string; created_at: string }[]
  sessionId: string
  vocalDelivery: VocalDeliveryScores | null
  hasAudio: boolean
}) {
  const dimensions = evaluation?.rubric_dimensions ?? rubric.dimensions ?? []

  const numScore = score != null ? Number(score) : null
  const displayScore = numScore !== null && isFinite(numScore) ? Math.round(numScore) : null

  const scoreColor = (s: number) => {
    if (s >= 7) return 'text-green-400 bg-green-500/10'
    if (s >= 4) return 'text-yellow-400 bg-yellow-500/10'
    return 'text-red-400 bg-red-500/10'
  }

  const overallColor = (s: number) => {
    if (s >= 70) return 'text-green-400'
    if (s >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Results panel */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-2xl">
          {/* Overall score */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-medium text-white/50">Overall Score</h2>
            <p className={`text-5xl font-bold ${displayScore !== null ? overallColor(displayScore) : 'text-white'}`}>
              {displayScore !== null ? displayScore : '—'}
              <span className="ml-1 text-2xl font-medium text-white/40">/ 100</span>
            </p>
            {evaluation?.overall_feedback && (
              <p className="mt-4 text-sm leading-relaxed text-white/70">{evaluation.overall_feedback}</p>
            )}
          </div>

          {/* Dimension scores */}
          {evaluation && dimensions.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-[#2dd4bf]">Dimension Scores</h2>
              <div className="flex flex-col gap-3">
                {dimensions.map(dim => {
                  const entry = evaluation.scores[dim.name]
                  const dimScore = entry?.score ?? null
                  return (
                    <div key={dim.name} className="rounded-xl border border-white/10 bg-[#111827] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{dim.name}</p>
                          <p className="mt-0.5 text-xs text-white/50">{dim.description}</p>
                        </div>
                        {dimScore !== null && (
                          <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${scoreColor(dimScore)}`}>
                            {dimScore}/10
                          </span>
                        )}
                      </div>
                      {entry?.rationale && (
                        <p className="mt-3 border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-white/60">
                          {entry.rationale}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Vocal Delivery */}
          {vocalDelivery && <VocalDeliveryPanel scores={vocalDelivery} />}
          {!vocalDelivery && hasAudio && <HumeAutoTrigger sessionId={sessionId} />}

          {/* Strengths & Improvements */}
          {evaluation && (
            <div className="mb-8 grid grid-cols-2 gap-4">
              {evaluation.strengths?.length > 0 && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-green-400">Strengths</h3>
                  <ul className="flex flex-col gap-1.5">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-300/80">
                        <span className="mt-0.5 shrink-0">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvements?.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-amber-400">Areas to Improve</h3>
                  <ul className="flex flex-col gap-1.5">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-300/80">
                        <span className="mt-0.5 shrink-0">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-[#2dd4bf] px-6 py-3 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Transcript panel */}
      <div className="hidden w-96 shrink-0 flex-col border-l border-white/10 bg-[#111827] lg:flex">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-[#2dd4bf]">Transcript</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="px-1 text-xs text-white/40">
                    {msg.role === 'user' ? 'You' : personaName}
                  </span>
                  <div className={[
                    'rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-[#2dd4bf] text-[#0a0e1a]'
                      : 'border border-white/10 bg-white/5 text-white/80',
                  ].join(' ')}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
