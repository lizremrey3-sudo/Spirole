import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { abandonSession } from '@/app/actions/sessions'
import ChatInterface from './chat-interface'
import PatientContextBar from './patient-context-bar'
import VocalDeliveryPanel from './vocal-delivery-panel'
import HumeAutoTrigger from './hume-auto-trigger'

type PersonaJson = Record<string, unknown>
type RubricDimension = { name: string; weight: number; description: string }
type RubricJson = { dimensions?: RubricDimension[] }

type PatientContext = {
  current_rx?: { OD?: string; OS?: string; add?: string }
  current_lens_style?: string
  previous_rx?: { OD?: string; OS?: string; add?: string }
  previous_lens_style?: string
  insurance?: string
  last_visit?: string
  notes?: string
}

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

  const [sessionResult, messagesResult, audioCheck] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, status, score, feedback, started_at, completed_at, scenarios(title, description, persona, rubric, patient_context)')
      .eq('id', id)
      .single(),
    supabase
      .from('session_messages')
      .select('id, role, content, created_at')
      .eq('session_id', id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true }),
    supabase.storage.from('session-audio').list('', { search: id }),
  ])

  if (sessionResult.error || !sessionResult.data) redirect('/dashboard')

  const session = sessionResult.data
  const messages = (messagesResult.data ?? []) as { id: string; role: 'user' | 'assistant'; content: string; created_at: string }[]

  const scenarioRaw = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios
  const scenarioTitle = (scenarioRaw?.title as string | undefined) ?? 'Training Session'
  const persona = (scenarioRaw?.persona ?? {}) as PersonaJson
  const rubric = (scenarioRaw?.rubric ?? {}) as RubricJson
  const patientContext = (scenarioRaw?.patient_context as PatientContext | null | undefined) ?? null
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
    <div className="flex h-screen flex-col bg-zinc-50">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-900 hover:text-zinc-600">
            Spirole
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-sm text-zinc-600">{scenarioTitle}</span>
          {isCompleted && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{user.email}</span>
          {!isCompleted && (
            <form action={abandonSession}>
              <input type="hidden" name="sessionId" value={id} />
              <button
                type="submit"
                className="text-sm text-zinc-400 transition-colors hover:text-red-600"
              >
                Abandon session
              </button>
            </form>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {isResumed && !isCompleted && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
          <p className="text-sm text-amber-800">
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

      {patientContext && !isCompleted && (
        <PatientContextBar ctx={patientContext} />
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
  // Prefer rubric_dimensions saved by the evaluate route (handles leadership coaching default rubric)
  const dimensions = evaluation?.rubric_dimensions ?? rubric.dimensions ?? []

  // Supabase returns numeric columns as strings; coerce and guard NaN
  const numScore = score != null ? Number(score) : null
  const displayScore = numScore !== null && isFinite(numScore) ? Math.round(numScore) : null

  const scoreColor = (s: number) => {
    if (s >= 7) return 'text-green-700 bg-green-50'
    if (s >= 4) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  const overallColor = (s: number) => {
    if (s >= 70) return 'text-green-700'
    if (s >= 40) return 'text-yellow-700'
    return 'text-red-700'
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Results panel */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-2xl">
          {/* Overall score */}
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-medium text-zinc-500">Overall Score</h2>
            <p className={`text-5xl font-bold ${displayScore !== null ? overallColor(displayScore) : 'text-zinc-900'}`}>
              {displayScore !== null ? displayScore : '—'}
              <span className="ml-1 text-2xl font-medium text-zinc-400">/ 100</span>
            </p>
            {evaluation?.overall_feedback && (
              <p className="mt-4 text-sm leading-relaxed text-zinc-700">{evaluation.overall_feedback}</p>
            )}
          </div>

          {/* Dimension scores */}
          {evaluation && dimensions.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Dimension Scores</h2>
              <div className="flex flex-col gap-3">
                {dimensions.map(dim => {
                  const entry = evaluation.scores[dim.name]
                  const dimScore = entry?.score ?? null
                  return (
                    <div key={dim.name} className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{dim.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">{dim.description}</p>
                        </div>
                        {dimScore !== null && (
                          <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${scoreColor(dimScore)}`}>
                            {dimScore}/10
                          </span>
                        )}
                      </div>
                      {entry?.rationale && (
                        <p className="mt-3 border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-600">
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
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-green-800">Strengths</h3>
                  <ul className="flex flex-col gap-1.5">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                        <span className="mt-0.5 shrink-0">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvements?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-amber-800">Areas to Improve</h3>
                  <ul className="flex flex-col gap-1.5">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
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
            className="inline-block rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Transcript panel */}
      <div className="hidden w-96 shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Transcript</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="px-1 text-xs text-zinc-400">
                    {msg.role === 'user' ? 'You' : personaName}
                  </span>
                  <div className={[
                    'rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-900',
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
