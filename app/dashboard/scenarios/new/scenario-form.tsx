'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createScenario } from '@/app/actions/scenarios'

const ASSOCIATE_TYPES = [
  { value: 'manager',      label: 'Manager' },
  { value: 'optician',     label: 'Optician' },
  { value: 'technician',   label: 'Technician' },
  { value: 'receptionist', label: 'Receptionist' },
] as const

const DEFAULT_PERSONA = `{
  "name": "",
  "tone": "",
  "background": ""
}`

const DEFAULT_RUBRIC = `{
  "dimensions": [
    {
      "name": "",
      "description": "",
      "max_score": 0
    }
  ]
}`

function validateJson(str: string): string | null {
  try {
    JSON.parse(str)
    return null
  } catch (e) {
    return (e as SyntaxError).message
  }
}

const inputCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'

export default function ScenarioForm() {
  const [state, formAction, pending] = useActionState(createScenario, null)

  const [persona, setPersona] = useState(DEFAULT_PERSONA)
  const [personaErr, setPersonaErr] = useState<string | null>(null)
  const [rubric, setRubric] = useState(DEFAULT_RUBRIC)
  const [rubricErr, setRubricErr] = useState<string | null>(null)
  const [showPatientContext, setShowPatientContext] = useState(false)

  const hasJsonError = !!personaErr || !!rubricErr

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium text-white/70">Title</label>
        <input id="title" name="title" type="text" required className={inputCls} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-white/70">
          Description{' '}
          <span className="font-normal text-white/40">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} className={`${inputCls} resize-y`} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="associate_type" className="text-sm font-medium text-white/70">Associate Type</label>
        <select
          id="associate_type"
          name="associate_type"
          required
          defaultValue="optician"
          className={`${inputCls} bg-[#0a0e1a]`}
        >
          {ASSOCIATE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="session_type" className="text-sm font-medium text-white/70">Session Type</label>
        <select
          id="session_type"
          name="session_type"
          defaultValue="sales_roleplay"
          className={`${inputCls} bg-[#0a0e1a]`}
        >
          <option value="sales_roleplay">Sales Roleplay</option>
          <option value="leadership_coaching">Leadership Coaching</option>
          <option value="interaction">Associate Interaction</option>
        </select>
      </div>

      <JsonField
        id="persona"
        label="Persona"
        hint="AI character config — name, tone, background"
        value={persona}
        error={personaErr}
        onChange={(v) => { setPersona(v); setPersonaErr(validateJson(v)) }}
        rows={8}
      />

      <JsonField
        id="rubric"
        label="Rubric"
        hint="Scoring dimensions — name, description, max_score"
        value={rubric}
        error={rubricErr}
        onChange={(v) => { setRubric(v); setRubricErr(validateJson(v)) }}
        rows={12}
      />

      {/* Patient Context */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowPatientContext(v => !v)}
          className="flex items-center gap-2 text-left text-sm font-medium text-white/70"
        >
          <span className={`transition-transform ${showPatientContext ? 'rotate-90' : ''}`}>▶</span>
          Patient Context
          <span className="font-normal text-white/40">(optional — sales roleplay only)</span>
        </button>

        {showPatientContext && (
          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Current Rx</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_current_rx_od" className="text-xs font-medium text-white/60">OD (right)</label>
                  <input id="pc_current_rx_od" name="pc_current_rx_od" placeholder="-2.50" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_current_rx_os" className="text-xs font-medium text-white/60">OS (left)</label>
                  <input id="pc_current_rx_os" name="pc_current_rx_os" placeholder="-3.00" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_current_rx_add" className="text-xs font-medium text-white/60">Add</label>
                  <input id="pc_current_rx_add" name="pc_current_rx_add" placeholder="+2.00" className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pc_current_lens_style" className="text-xs font-medium text-white/60">Lens style</label>
                <input id="pc_current_lens_style" name="pc_current_lens_style" placeholder="e.g. single vision, progressive" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Previous Rx</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_prev_rx_od" className="text-xs font-medium text-white/60">OD (right)</label>
                  <input id="pc_prev_rx_od" name="pc_prev_rx_od" placeholder="-2.25" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_prev_rx_os" className="text-xs font-medium text-white/60">OS (left)</label>
                  <input id="pc_prev_rx_os" name="pc_prev_rx_os" placeholder="-2.75" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pc_prev_rx_add" className="text-xs font-medium text-white/60">Add</label>
                  <input id="pc_prev_rx_add" name="pc_prev_rx_add" placeholder="" className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pc_prev_lens_style" className="text-xs font-medium text-white/60">Lens style</label>
                <input id="pc_prev_lens_style" name="pc_prev_lens_style" placeholder="e.g. single vision" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="pc_insurance" className="text-xs font-medium text-white/60">Insurance</label>
                <input id="pc_insurance" name="pc_insurance" placeholder="e.g. VSP, EyeMed, none" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pc_last_visit" className="text-xs font-medium text-white/60">Last visit</label>
                <input id="pc_last_visit" name="pc_last_visit" type="date" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pc_notes" className="text-xs font-medium text-white/60">Additional notes</label>
              <textarea id="pc_notes" name="pc_notes" rows={2} placeholder="e.g. complains about adaptation with progressives" className={`${inputCls} resize-y`} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending || hasJsonError}
          className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create Scenario'}
        </button>
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-white/70">
          Cancel
        </Link>
      </div>
    </form>
  )
}

function JsonField({
  id,
  label,
  hint,
  value,
  error,
  onChange,
  rows,
}: {
  id: string
  label: string
  hint: string
  value: string
  error: string | null
  onChange: (v: string) => void
  rows: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-white/70">{label}</label>
        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/50">JSON</span>
      </div>
      <p className="text-xs text-white/40">{hint}</p>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={[
          'rounded-md border bg-white/5 px-3 py-2 font-mono text-sm text-white outline-none focus:ring-1 resize-y',
          error
            ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/40'
            : 'border-white/10 focus:border-[#2dd4bf]/60 focus:ring-[#2dd4bf]/40',
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
