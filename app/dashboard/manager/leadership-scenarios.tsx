'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '@/app/actions/sessions'

type Scenario = { id: string; title: string; description: string | null }

export default function LeadershipScenarios({ scenarios }: { scenarios: Scenario[] }) {
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleStart = async (scenarioId: string) => {
    setStarting(scenarioId)
    setError(null)
    try {
      const result = await createSession(scenarioId)
      if ('sessionId' in result) {
        router.push(`/dashboard/session/${result.sessionId}${result.resumed ? '?resumed=1' : ''}`)
      } else {
        setStarting(null)
        setError(result.error)
      }
    } catch (err) {
      setStarting(null)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (scenarios.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        No leadership coaching scenarios yet. Create one to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {scenarios.map(s => (
        <div
          key={s.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{s.title}</p>
            {s.description && (
              <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{s.description}</p>
            )}
          </div>
          <button
            onClick={() => handleStart(s.id)}
            disabled={starting !== null}
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {starting === s.id ? 'Starting…' : 'Start'}
          </button>
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
