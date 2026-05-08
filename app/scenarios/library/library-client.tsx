'use client'

import { useState, useTransition } from 'react'
import { upsertScenarioCustomization } from './actions'

export type SharedScenario = {
  id: string
  title: string
  category: string | null
  core_skill: string | null
  difficulty: number | null
  associate_type: string
  description: string | null
}

export type Customization = {
  scenario_id: string
  tenant_id: string
  brand_name: string | null
  industry: string | null
  product_type: string | null
  price_point_low: string | null
  price_point_high: string | null
  difficulty_override: number | null
  regional_notes: string | null
  custom_context: string | null
  is_enabled: boolean
}

// ── helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  objection:       'border-red-500/30 bg-red-500/10 text-red-400',
  upset_customer:  'border-orange-500/30 bg-orange-500/10 text-orange-400',
  upsell:          'border-purple-500/30 bg-purple-500/10 text-purple-400',
  closing:         'border-green-500/30 bg-green-500/10 text-green-400',
  opening:         'border-blue-500/30 bg-blue-500/10 text-blue-400',
}
const defaultCategoryStyle = 'border-white/10 bg-white/5 text-white/50'

function categoryStyle(cat: string | null) {
  return cat ? (CATEGORY_STYLES[cat] ?? defaultCategoryStyle) : defaultCategoryStyle
}

function categoryLabel(cat: string | null) {
  if (!cat) return 'General'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function DifficultyDots({ level }: { level: number | null }) {
  const n = Math.max(0, Math.min(5, level ?? 0))
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < n ? 'bg-[#2dd4bf]' : 'bg-white/15'}`} />
      ))}
    </div>
  )
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
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

// ── customization panel ───────────────────────────────────────────────────────

const inputCls = 'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'
const labelCls = 'text-xs font-medium text-white/60'

type PanelData = {
  brand_name: string
  industry: string
  product_type: string
  price_point_low: string
  price_point_high: string
  difficulty_override: string
  regional_notes: string
  custom_context: string
}

function blankForm(c: Customization | undefined): PanelData {
  return {
    brand_name:          c?.brand_name ?? '',
    industry:            c?.industry ?? '',
    product_type:        c?.product_type ?? '',
    price_point_low:     c?.price_point_low ?? '',
    price_point_high:    c?.price_point_high ?? '',
    difficulty_override: c?.difficulty_override != null ? String(c.difficulty_override) : '',
    regional_notes:      c?.regional_notes ?? '',
    custom_context:      c?.custom_context ?? '',
  }
}

function CustomizePanel({
  scenario,
  existing,
  onClose,
  onSaved,
}: {
  scenario: SharedScenario
  existing: Customization | undefined
  onClose: () => void
  onSaved: (c: Customization) => void
}) {
  const [form, setForm] = useState<PanelData>(blankForm(existing))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof PanelData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await upsertScenarioCustomization(scenario.id, {
      brand_name:          form.brand_name || undefined,
      industry:            form.industry || undefined,
      product_type:        form.product_type || undefined,
      price_point_low:     form.price_point_low || undefined,
      price_point_high:    form.price_point_high || undefined,
      difficulty_override: form.difficulty_override ? Number(form.difficulty_override) : null,
      regional_notes:      form.regional_notes || undefined,
      custom_context:      form.custom_context || undefined,
      is_enabled:          existing?.is_enabled ?? false,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved({
      scenario_id:         scenario.id,
      tenant_id:           existing?.tenant_id ?? '',
      brand_name:          form.brand_name || null,
      industry:            form.industry || null,
      product_type:        form.product_type || null,
      price_point_low:     form.price_point_low || null,
      price_point_high:    form.price_point_high || null,
      difficulty_override: form.difficulty_override ? Number(form.difficulty_override) : null,
      regional_notes:      form.regional_notes || null,
      custom_context:      form.custom_context || null,
      is_enabled:          existing?.is_enabled ?? false,
    })
    onClose()
  }

  return (
    <>
      {/* overlay */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-[#111827] shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2dd4bf]">Customize</p>
            <h2 className="mt-0.5 text-base font-semibold text-white leading-snug">{scenario.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* form */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Brand name</label>
                <input value={form.brand_name} onChange={set('brand_name')} placeholder="e.g. Warby Parker" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Industry</label>
                <input value={form.industry} onChange={set('industry')} placeholder="e.g. optical" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Product type</label>
              <input value={form.product_type} onChange={set('product_type')} placeholder="e.g. progressive lenses" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Price point low</label>
                <input value={form.price_point_low} onChange={set('price_point_low')} placeholder="e.g. $200" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Price point high</label>
                <input value={form.price_point_high} onChange={set('price_point_high')} placeholder="e.g. $800" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Difficulty override</label>
              <select
                value={form.difficulty_override}
                onChange={set('difficulty_override')}
                className={`${inputCls} bg-[#0a0e1a]`}
              >
                <option value="">Use scenario default</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Regional notes <span className="font-normal text-white/30">(optional)</span></label>
              <textarea
                value={form.regional_notes}
                onChange={set('regional_notes')}
                rows={2}
                placeholder="e.g. Patients in this area often ask about insurance coverage first"
                className={`${inputCls} resize-y`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Custom context <span className="font-normal text-white/30">(optional)</span></label>
              <textarea
                value={form.custom_context}
                onChange={set('custom_context')}
                rows={3}
                placeholder="e.g. Our store uses only premium frame brands. Staff should always recommend anti-reflective coating."
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save customization'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  customization,
  onToggle,
  onCustomize,
}: {
  scenario: SharedScenario
  customization: Customization | undefined
  onToggle: (enabled: boolean) => void
  onCustomize: () => void
}) {
  const isCustomized = !!customization
  const isEnabled = customization?.is_enabled ?? false
  const effectiveDifficulty = customization?.difficulty_override ?? scenario.difficulty

  return (
    <div
      className={[
        'flex flex-col rounded-xl border bg-[#111827] p-5 transition-opacity',
        isCustomized ? 'border-white/10' : 'border-white/[0.06] opacity-60',
      ].join(' ')}
    >
      {/* top row: category + toggle */}
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${categoryStyle(scenario.category)}`}>
          {categoryLabel(scenario.category)}
        </span>
        <div className="flex flex-col items-end gap-1">
          <Toggle
            checked={isEnabled}
            disabled={!isCustomized}
            onChange={onToggle}
          />
          <span className="text-[10px] text-white/30">
            {isCustomized ? (isEnabled ? 'Enabled' : 'Disabled') : 'Customize first'}
          </span>
        </div>
      </div>

      {/* title */}
      <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{scenario.title}</h3>

      {/* core skill */}
      {scenario.core_skill && (
        <p className="mt-1 text-xs text-white/40">{scenario.core_skill}</p>
      )}

      {/* difficulty */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/30">Difficulty</span>
        <DifficultyDots level={effectiveDifficulty} />
        {customization?.difficulty_override != null && (
          <span className="text-[10px] text-[#2dd4bf]/70">customized</span>
        )}
      </div>

      {/* not customized prompt */}
      {!isCustomized && (
        <p className="mt-3 text-xs text-white/40">
          Customize this scenario with your brand and context before enabling it for your team.
        </p>
      )}

      {/* customize button */}
      <button
        onClick={onCustomize}
        className="mt-4 w-full rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        {isCustomized ? 'Edit customization' : 'Customize for my office'}
      </button>
    </div>
  )
}

// ── main client component ─────────────────────────────────────────────────────

export default function LibraryClient({
  scenarios,
  initialCustomizations,
}: {
  scenarios: SharedScenario[]
  initialCustomizations: Customization[]
  tenantId: string
}) {
  const [customizations, setCustomizations] = useState<Map<string, Customization>>(
    () => new Map(initialCustomizations.map(c => [c.scenario_id, c]))
  )
  const [panelScenario, setPanelScenario] = useState<SharedScenario | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(scenario: SharedScenario, enabled: boolean) {
    const existing = customizations.get(scenario.id)
    if (!existing) return

    // optimistic update
    setCustomizations(prev => {
      const next = new Map(prev)
      next.set(scenario.id, { ...existing, is_enabled: enabled })
      return next
    })

    startTransition(async () => {
      const result = await upsertScenarioCustomization(scenario.id, { is_enabled: enabled })
      if (result.error) {
        // revert on failure
        setCustomizations(prev => {
          const next = new Map(prev)
          next.set(scenario.id, existing)
          return next
        })
      }
    })
  }

  function handleSaved(updated: Customization) {
    setCustomizations(prev => {
      const next = new Map(prev)
      next.set(updated.scenario_id, updated)
      return next
    })
  }

  if (scenarios.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-16 text-center">
        <p className="text-sm text-white/40">No shared scenarios available yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map(scenario => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            customization={customizations.get(scenario.id)}
            onToggle={enabled => handleToggle(scenario, enabled)}
            onCustomize={() => setPanelScenario(scenario)}
          />
        ))}
      </div>

      {panelScenario && (
        <CustomizePanel
          scenario={panelScenario}
          existing={customizations.get(panelScenario.id)}
          onClose={() => setPanelScenario(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
