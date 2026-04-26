'use client'

import { useState } from 'react'

type Rx = { OD?: string; OS?: string; add?: string }

type PatientContext = {
  current_rx?: Rx
  current_lens_style?: string
  previous_rx?: Rx
  previous_lens_style?: string
  insurance?: string
  last_visit?: string
  notes?: string
}

function rxLabel(rx?: Rx) {
  if (!rx) return null
  const parts = [rx.OD && `OD ${rx.OD}`, rx.OS && `OS ${rx.OS}`, rx.add && `Add ${rx.add}`].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export default function PatientContextBar({ ctx }: { ctx: PatientContext }) {
  const [open, setOpen] = useState(false)

  const currentRx = rxLabel(ctx.current_rx)
  const prevRx    = rxLabel(ctx.previous_rx)

  const chips = [
    currentRx && { label: 'Current Rx', value: currentRx },
    ctx.current_lens_style && { label: 'Lens', value: ctx.current_lens_style },
    ctx.insurance && { label: 'Insurance', value: ctx.insurance },
    ctx.last_visit && { label: 'Last visit', value: ctx.last_visit },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="shrink-0 border-b border-white/10 bg-[#111827]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-6 py-2.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Patient Record</span>
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {chips.slice(0, 3).map(chip => (
            <span key={chip.label} className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
              <span className="font-medium text-white/40">{chip.label}: </span>{chip.value}
            </span>
          ))}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-6 py-4">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentRx && <Field label="Current Rx" value={currentRx} />}
            {ctx.current_lens_style && <Field label="Current lens style" value={ctx.current_lens_style} />}
            {prevRx && <Field label="Previous Rx" value={prevRx} />}
            {ctx.previous_lens_style && <Field label="Previous lens style" value={ctx.previous_lens_style} />}
            {ctx.insurance && <Field label="Insurance" value={ctx.insurance} />}
            {ctx.last_visit && <Field label="Last visit" value={ctx.last_visit} />}
            {ctx.notes && <Field label="Notes" value={ctx.notes} wide />}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <p className="text-xs font-medium text-white/40">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  )
}
