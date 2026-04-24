'use client'

import { useState, useTransition } from 'react'
import { generateAssessment, type AssessmentContent, type GenerateAssessmentResult } from '@/app/actions/assessments'

type CachedAssessment = { content: AssessmentContent; generated_at: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-sm leading-relaxed text-zinc-800">{text}</p>
    </div>
  )
}

export default function AssessmentPanel({
  practiceId,
  tenantId,
  initial,
  label,
}: {
  practiceId: string | null
  tenantId: string
  initial: CachedAssessment | null
  label: string
}) {
  const [assessment, setAssessment] = useState<CachedAssessment | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    setError(null)
    startTransition(async () => {
      const result: GenerateAssessmentResult = await generateAssessment(practiceId, tenantId)
      if ('error' in result) {
        setError(result.error)
      } else {
        setAssessment(result)
      }
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{label} Assessment</h2>
          {assessment && (
            <p className="mt-0.5 text-xs text-zinc-400">
              Generated {formatDate(assessment.generated_at)}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          {isPending ? 'Generating…' : assessment ? 'Regenerate' : `Generate ${label} Assessment`}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-200">
          {error}
        </p>
      )}

      {isPending && !assessment && (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-6 py-10 text-center">
          <p className="text-sm text-zinc-400 animate-pulse">Analyzing session data…</p>
        </div>
      )}

      {!assessment && !isPending && (
        <p className="text-sm text-zinc-400">
          No assessment generated yet. Click the button above to analyze the last 14 days of session data.
        </p>
      )}

      {assessment && (
        <div className="flex flex-col gap-3">
          <Section label="Trend Analysis" text={assessment.content.trend_analysis} />
          <Section label="Opportunities" text={assessment.content.opportunities} />
          <Section label="Team Communication Style" text={assessment.content.team_communication_style} />
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Actionable Tips</p>
            <ol className="flex flex-col gap-3 list-none">
              {(assessment.content.actionable_tips as string[]).map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-800">{tip}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
