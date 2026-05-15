'use client'

import { useState, useTransition } from 'react'
import { activateLibraryScenario, deactivateLibraryScenario } from '@/app/actions/scenarios'

type Scenario = {
  id: string
  title: string
  description: string | null
  associate_type: string
  industry: string
}

const ASSOCIATE_LABELS: Record<string, string> = {
  manager:              'Manager',
  optician:             'Optician',
  technician:           'Technician',
  receptionist:         'Receptionist',
  sales_associate:      'Sales Associate',
  call_center:          'Call Center',
  consultant:           'Consultant',
  insurance_specialist: 'Insurance Specialist',
  account_executive:    'Account Executive',
  clinical_staff:       'Clinical Staff',
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-[#2dd4bf]' : 'bg-white/20',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function ScenarioCard({
  scenario,
  activated,
  onToggle,
}: {
  scenario: Scenario
  activated: boolean
  onToggle: (activate: boolean) => void
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-block shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50">
          {ASSOCIATE_LABELS[scenario.associate_type] ?? scenario.associate_type}
        </span>
        <div className="flex flex-col items-end gap-1">
          <Toggle checked={activated} disabled={false} onChange={onToggle} />
          <span className="text-[10px] text-white/30">{activated ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{scenario.title}</h3>
      {scenario.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-white/50">{scenario.description}</p>
      )}
    </div>
  )
}

export default function LibraryClient({
  scenarios,
  initialActivatedIds,
}: {
  scenarios: Scenario[]
  initialActivatedIds: string[]
}) {
  const [activated, setActivated] = useState<Set<string>>(() => new Set(initialActivatedIds))
  const [toggling, setToggling] = useState<Set<string>>(() => new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handleToggle(scenario: Scenario, activate: boolean) {
    if (toggling.has(scenario.id)) return

    setToggling(prev => new Set(prev).add(scenario.id))
    setErrors(prev => { const n = { ...prev }; delete n[scenario.id]; return n })

    const optimistic = new Set(activated)
    if (activate) optimistic.add(scenario.id)
    else optimistic.delete(scenario.id)
    setActivated(optimistic)

    startTransition(async () => {
      const result = activate
        ? await activateLibraryScenario(scenario.id)
        : await deactivateLibraryScenario(scenario.id)

      if (result.error) {
        // revert
        const reverted = new Set(activated)
        setActivated(reverted)
        setErrors(prev => ({ ...prev, [scenario.id]: result.error! }))
      }

      setToggling(prev => {
        const n = new Set(prev)
        n.delete(scenario.id)
        return n
      })
    })
  }

  if (scenarios.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-16 text-center">
        <p className="text-sm text-white/40">No approved public scenarios available for your industry yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {errors[Object.keys(errors)[0]] && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {Object.values(errors)[0]}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map(scenario => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            activated={activated.has(scenario.id)}
            onToggle={activate => handleToggle(scenario, activate)}
          />
        ))}
      </div>
    </div>
  )
}
