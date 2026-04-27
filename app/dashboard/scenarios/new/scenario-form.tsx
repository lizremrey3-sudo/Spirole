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

const TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Frustrated',
  'Anxious',
  'Confused',
  'Resistant',
]

type Dimension = { id: number; name: string; description: string; weight: number }

let _nextId = 6
const nextId = () => _nextId++

const DEFAULT_DIMENSIONS: Dimension[] = [
  { id: 1, name: 'objective_completion',  description: 'Did the associate complete the primary objective of the scenario?',               weight: 10 },
  { id: 2, name: 'empathy',               description: 'Did the associate demonstrate empathy and emotional awareness toward the patient?', weight: 10 },
  { id: 3, name: 'product_knowledge',     description: 'Did the associate demonstrate accurate knowledge of products and lenses?',          weight: 10 },
  { id: 4, name: 'communication_clarity', description: 'Was the communication clear, organized, and easy for the patient to understand?',   weight: 10 },
  { id: 5, name: 'confidence',            description: 'Did the associate communicate with appropriate confidence and professionalism?',     weight: 10 },
]

const inputCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'
const sectionLabel = 'text-sm font-medium text-white/70'

export default function ScenarioForm({
  defaultAssociateType,
  defaultSessionType,
}: {
  defaultAssociateType?: string
  defaultSessionType?: string
} = {}) {
  const [state, formAction, pending] = useActionState(createScenario, null)

  // Persona fields
  const [personaName, setPersonaName] = useState('')
  const [personaTone, setPersonaTone] = useState('Professional')
  const [personaBackground, setPersonaBackground] = useState('')
  const [personaOpeningLine, setPersonaOpeningLine] = useState('')

  // Rubric dimensions
  const [dimensions, setDimensions] = useState<Dimension[]>(DEFAULT_DIMENSIONS)

  // Patient context collapsible
  const [showPatientContext, setShowPatientContext] = useState(false)

  // Serialized JSON for the action
  const personaJson = JSON.stringify({
    name: personaName,
    tone: personaTone,
    background: personaBackground,
    opening_line: personaOpeningLine,
  })

  const rubricJson = JSON.stringify({
    dimensions: dimensions.map(({ name, description, weight }) => ({ name, description, weight })),
  })

  const updateDimension = (id: number, field: keyof Omit<Dimension, 'id'>, value: string | number) =>
    setDimensions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))

  const addDimension = () =>
    setDimensions(prev => [...prev, { id: nextId(), name: '', description: '', weight: 10 }])

  const removeDimension = (id: number) =>
    setDimensions(prev => prev.filter(d => d.id !== id))

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      {/* Hidden JSON inputs for the action */}
      <input type="hidden" name="persona" value={personaJson} />
      <input type="hidden" name="rubric" value={rubricJson} />

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className={sectionLabel}>Title</label>
        <input id="title" name="title" type="text" required className={inputCls} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={sectionLabel}>
          Description <span className="font-normal text-white/40">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} className={`${inputCls} resize-y`} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="associate_type" className={sectionLabel}>Associate Type</label>
        <select
          id="associate_type"
          name="associate_type"
          required
          defaultValue={defaultAssociateType ?? 'optician'}
          className={`${inputCls} bg-[#0a0e1a]`}
        >
          {ASSOCIATE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="session_type" className={sectionLabel}>Session Type</label>
        <select
          id="session_type"
          name="session_type"
          defaultValue={defaultSessionType ?? 'sales_roleplay'}
          className={`${inputCls} bg-[#0a0e1a]`}
        >
          <option value="sales_roleplay">Sales Roleplay</option>
          <option value="leadership_coaching">Leadership Coaching</option>
          <option value="interaction">Associate Interaction</option>
        </select>
      </div>

      {/* ── Persona ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <p className={sectionLabel}>Persona</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/60">Name</label>
          <input
            value={personaName}
            onChange={e => setPersonaName(e.target.value)}
            placeholder="e.g. Sarah"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/60">Tone</label>
          <select
            value={personaTone}
            onChange={e => setPersonaTone(e.target.value)}
            className={`${inputCls} bg-[#0a0e1a]`}
          >
            {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/60">Background</label>
          <textarea
            value={personaBackground}
            onChange={e => setPersonaBackground(e.target.value)}
            rows={2}
            placeholder="e.g. Long-time glasses wearer, first time trying contacts"
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/60">Opening Line</label>
          <textarea
            value={personaOpeningLine}
            onChange={e => setPersonaOpeningLine(e.target.value)}
            rows={2}
            placeholder="e.g. Hi, I have an appointment — I think I'm a few minutes late?"
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      {/* ── Rubric ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <p className={sectionLabel}>Rubric</p>

        <div className="flex flex-col gap-3">
          {dimensions.map((dim, i) => (
            <div key={dim.id} className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/40">Dimension {i + 1}</span>
                {dimensions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDimension(dim.id)}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-white/60">Name</label>
                  <input
                    value={dim.name}
                    onChange={e => updateDimension(dim.id, 'name', e.target.value)}
                    placeholder="e.g. empathy"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-white/60">Max Score</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={dim.weight}
                    onChange={e => updateDimension(dim.id, 'weight', Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-white/60">Description</label>
                <textarea
                  value={dim.description}
                  onChange={e => updateDimension(dim.id, 'description', e.target.value)}
                  rows={2}
                  placeholder="What behaviour or skill does this dimension assess?"
                  className={`${inputCls} resize-y`}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addDimension}
          className="self-start rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          + Add Dimension
        </button>
      </div>

      {/* ── Patient Context (collapsible) ────────────────────────────── */}
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
          disabled={pending}
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
