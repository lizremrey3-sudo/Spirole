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
      <p className="text-sm text-white/40">
        No leadership coaching scenarios yet. Create one to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {scenarios.map(s => (
        <div
          key={s.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{s.title}</p>
            {s.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{s.description}</p>
            )}
          </div>
          <button
            onClick={() => handleStart(s.id)}
            disabled={starting !== null}
            className="shrink-0 rounded-md bg-[#2dd4bf] px-3 py-1.5 text-xs font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
          >
            {starting === s.id ? 'Starting…' : 'Start'}
          </button>
        </div>
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
