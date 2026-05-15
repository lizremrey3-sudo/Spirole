'use client'

import { useState, useTransition } from 'react'
import { approveLibraryScenario, rejectLibraryScenario } from '@/app/actions/scenarios'

type PendingScenario = {
  id: string
  title: string
  description: string | null
  associate_type: string
  tenantName: string
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

export default function LibraryManagementPanel({
  initialScenarios,
}: {
  initialScenarios: PendingScenario[]
}) {
  const [scenarios, setScenarios] = useState(initialScenarios)
  const [busy, setBusy] = useState<Set<string>>(() => new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handle(id: string, action: 'approve' | 'reject') {
    setBusy(prev => new Set(prev).add(id))
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    startTransition(async () => {
      const result = action === 'approve'
        ? await approveLibraryScenario(id)
        : await rejectLibraryScenario(id)

      if (result.error) {
        setErrors(prev => ({ ...prev, [id]: result.error! }))
      } else {
        setScenarios(prev => prev.filter(s => s.id !== id))
      }

      setBusy(prev => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Library Management</h2>
      <p className="mb-5 text-xs text-white/40">Scenarios submitted for the public library, pending review.</p>

      {scenarios.length === 0 ? (
        <p className="text-sm text-white/40">No scenarios pending approval.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{scenario.title}</p>
                {scenario.description && (
                  <p className="mt-0.5 text-xs text-white/50 line-clamp-2">{scenario.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-white/30">
                    {ASSOCIATE_LABELS[scenario.associate_type] ?? scenario.associate_type}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/30">{scenario.tenantName}</span>
                </div>
                {errors[scenario.id] && (
                  <p className="mt-1 text-xs text-red-400">{errors[scenario.id]}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  disabled={busy.has(scenario.id)}
                  onClick={() => handle(scenario.id, 'reject')}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  disabled={busy.has(scenario.id)}
                  onClick={() => handle(scenario.id, 'approve')}
                  className="rounded-md bg-[#2dd4bf] px-3 py-1.5 text-xs font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-40"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
