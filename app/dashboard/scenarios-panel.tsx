'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '@/app/actions/sessions'

type AssociateType = 'manager' | 'optician' | 'technician' | 'receptionist'

type Scenario = {
  id: string
  title: string
  description: string | null
  associate_type: AssociateType
}

const ROLES: { type: AssociateType; label: string; description: string }[] = [
  { type: 'manager',      label: 'Manager',      description: 'Leadership and team oversight scenarios' },
  { type: 'optician',     label: 'Optician',      description: 'Optical sales and patient consultation' },
  { type: 'technician',   label: 'Technician',    description: 'Technical support and equipment handling' },
  { type: 'receptionist', label: 'Receptionist',  description: 'Front desk and scheduling workflows' },
]

export default function ScenariosPanel({ scenarios }: { scenarios: Scenario[] }) {
  const [selected, setSelected] = useState<AssociateType | null>(null)
  const [starting, setStarting] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const router = useRouter()

  const handleStartSession = async (scenarioId: string) => {
    setStarting(scenarioId)
    setStartError(null)
    try {
      const result = await createSession(scenarioId)
      if ('sessionId' in result) {
        const url = result.resumed
          ? `/dashboard/session/${result.sessionId}?resumed=1`
          : `/dashboard/session/${result.sessionId}`
        router.push(url)
      } else {
        setStarting(null)
        setStartError(result.error)
      }
    } catch (err) {
      setStarting(null)
      setStartError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const countFor = (type: AssociateType) => scenarios.filter(s => s.associate_type === type).length

  const filtered = selected ? scenarios.filter(s => s.associate_type === selected) : []

  return (
    <section className="w-full">
      <h2 className="mb-4 text-base font-semibold text-[#2dd4bf]">Training Scenarios</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map(({ type, label, description }) => {
          const count = countFor(type)
          const isSelected = selected === type
          return (
            <button
              key={type}
              onClick={() => setSelected(isSelected ? null : type)}
              className={[
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                isSelected
                  ? 'border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#2dd4bf]'
                  : 'border-white/10 bg-[#111827] text-white hover:border-white/20 hover:bg-white/5',
              ].join(' ')}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className={`text-xs leading-snug ${isSelected ? 'text-[#2dd4bf]/70' : 'text-white/50'}`}>
                {description}
              </span>
              <span className={`mt-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                isSelected ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]' : 'bg-white/10 text-white/50'
              }`}>
                {count} {count === 1 ? 'scenario' : 'scenarios'}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              No active scenarios for {ROLES.find(r => r.type === selected)?.label} yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map(scenario => (
                <li
                  key={scenario.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-[#111827] px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{scenario.title}</p>
                    {scenario.description && (
                      <p className="mt-1 text-sm text-white/50">{scenario.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartSession(scenario.id)}
                    disabled={starting !== null}
                    className="shrink-0 rounded-md bg-[#2dd4bf] px-3 py-1.5 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
                  >
                    {starting === scenario.id ? 'Starting…' : 'Start Session'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {startError && (
        <p className="mt-4 text-sm text-red-400">{startError}</p>
      )}

      {!selected && (
        <p className="mt-6 text-sm text-white/40">Select a role above to see available scenarios.</p>
      )}
    </section>
  )
}
