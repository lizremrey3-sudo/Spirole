'use client'

import { useState, useTransition } from 'react'
import { submitQuiz, startSessionFromLesson } from '@/app/actions/lessons'
import type { QuizQuestion } from '@/app/actions/lessons'

type Props = {
  lessonId: string
  questions: QuizQuestion[]
  scenarioId: string | null
  initialPassed: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizClient({ lessonId, questions, scenarioId, initialPassed }: Props) {
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [passed, setPassed] = useState(initialPassed)
  const [score, setScore] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // Shuffle answer choices once on mount
  const [choices] = useState(() =>
    questions.map(q => shuffle([q.correct_answer, ...q.distractors]))
  )

  function handleSubmit() {
    let correct = 0
    for (let i = 0; i < questions.length; i++) {
      if (selected[i] === questions[i].correct_answer) correct++
    }
    setScore(correct)
    const p = correct / questions.length >= 2 / 3
    startTransition(async () => {
      await submitQuiz(lessonId, correct, questions.length)
      setSubmitted(true)
      setPassed(p)
    })
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
        <p className="text-sm text-white/40">No quiz questions available for this lesson.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">Knowledge Check</h2>
      <p className="mb-6 text-sm text-white/40">Answer all questions, then submit. Pass rate: 2 out of {questions.length}.</p>

      {!submitted ? (
        <div className="flex flex-col gap-6">
          {questions.map((q, qi) => (
            <div key={qi}>
              <p className="mb-3 text-sm font-medium text-white">
                {qi + 1}. {q.question}
              </p>
              <div className="flex flex-col gap-2">
                {choices[qi].map((choice, ci) => (
                  <button
                    key={ci}
                    onClick={() => setSelected(s => ({ ...s, [qi]: choice }))}
                    className={[
                      'rounded-lg border px-4 py-2.5 text-left text-sm transition-colors',
                      selected[qi] === choice
                        ? 'border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#2dd4bf]'
                        : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white/80',
                    ].join(' ')}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={Object.keys(selected).length < questions.length || isPending}
            className="mt-2 w-full rounded-lg bg-[#2dd4bf] px-4 py-3 text-sm font-semibold text-[#0a0e1a] transition-opacity disabled:opacity-40"
          >
            {isPending ? 'Submitting…' : 'Submit Answers'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Per-question result */}
          {questions.map((q, qi) => {
            const isCorrect = selected[qi] === q.correct_answer
            return (
              <div
                key={qi}
                className={[
                  'rounded-lg border p-4',
                  isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-400/30 bg-red-400/5',
                ].join(' ')}
              >
                <p className="mb-2 text-sm font-medium text-white">
                  {qi + 1}. {q.question}
                </p>
                <p className={`text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '✓ Correct' : `✗ You answered: ${selected[qi]}`}
                </p>
                {!isCorrect && (
                  <p className="mt-1 text-sm text-white/50">
                    Correct answer: {q.correct_answer}
                  </p>
                )}
              </div>
            )
          })}

          {/* Score summary */}
          <div className={[
            'rounded-xl border p-5 text-center',
            passed ? 'border-[#2dd4bf]/30 bg-[#2dd4bf]/5' : 'border-white/10 bg-white/5',
          ].join(' ')}>
            <p className="text-2xl font-bold text-white">
              {score}/{questions.length}
            </p>
            <p className={`mt-1 text-sm font-medium ${passed ? 'text-[#2dd4bf]' : 'text-white/50'}`}>
              {passed ? 'Lesson complete!' : 'Not quite — review and try again.'}
            </p>
          </div>

          {/* Practice CTA */}
          {passed && scenarioId && (
            <form action={startSessionFromLesson.bind(null, scenarioId)}>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#2dd4bf] px-4 py-3 text-sm font-semibold text-[#0a0e1a] transition-opacity hover:opacity-90"
              >
                Practice This — Start Roleplay →
              </button>
            </form>
          )}

          {!passed && (
            <button
              onClick={() => {
                setSelected({})
                setSubmitted(false)
                setScore(null)
              }}
              className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
