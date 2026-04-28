'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string } | null

const VALID_TYPES = ['manager', 'optician', 'technician', 'receptionist']

export async function createScenario(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const associate_type = formData.get('associate_type') as string
  const rawSessionType = (formData.get('session_type') as string | null) || 'sales_roleplay'
  const session_type = rawSessionType === 'leadership_coaching' ? 'leadership_coaching' : 'sales_roleplay'
  const personaRaw = formData.get('persona') as string
  const rubricRaw = formData.get('rubric') as string

  if (!title) return { error: 'Title is required.' }

  let persona: unknown
  let rubric: unknown

  try {
    persona = JSON.parse(personaRaw)
  } catch {
    return { error: 'Persona must be valid JSON.' }
  }

  try {
    rubric = JSON.parse(rubricRaw)
  } catch {
    return { error: 'Rubric must be valid JSON.' }
  }

  const g = (key: string) => (formData.get(key) as string | null)?.trim() || null
  const pcCurrentRxOD  = g('pc_current_rx_od')
  const pcCurrentRxOS  = g('pc_current_rx_os')
  const pcCurrentRxAdd = g('pc_current_rx_add')
  const pcCurrentLens  = g('pc_current_lens_style')
  const pcPrevRxOD     = g('pc_prev_rx_od')
  const pcPrevRxOS     = g('pc_prev_rx_os')
  const pcPrevRxAdd    = g('pc_prev_rx_add')
  const pcPrevLens     = g('pc_prev_lens_style')
  const pcInsurance    = g('pc_insurance')
  const pcLastVisit    = g('pc_last_visit')
  const pcNotes        = g('pc_notes')

  const hasPatientContext = [
    pcCurrentRxOD, pcCurrentRxOS, pcCurrentRxAdd, pcCurrentLens,
    pcPrevRxOD, pcPrevRxOS, pcPrevRxAdd, pcPrevLens,
    pcInsurance, pcLastVisit, pcNotes,
  ].some(Boolean)

  const patient_context = hasPatientContext ? {
    current_rx: { OD: pcCurrentRxOD ?? '', OS: pcCurrentRxOS ?? '', add: pcCurrentRxAdd ?? '' },
    current_lens_style: pcCurrentLens ?? '',
    previous_rx: { OD: pcPrevRxOD ?? '', OS: pcPrevRxOS ?? '', add: pcPrevRxAdd ?? '' },
    previous_lens_style: pcPrevLens ?? '',
    insurance: pcInsurance ?? '',
    last_visit: pcLastVisit ?? '',
    notes: pcNotes ?? '',
  } : null

  const { error } = await supabase.from('scenarios').insert({
    title,
    description,
    associate_type,
    session_type,
    persona,
    rubric,
    patient_context,
    tenant_id: profile.tenant_id,
    created_by: user.id,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

type ImportRow = {
  title: string
  description: string
  associate_type: string
  persona: string
  rubric: string
}

export async function importScenarios(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const rowsRaw = formData.get('rows') as string
  if (!rowsRaw) return { error: 'No data to import.' }

  let rows: ImportRow[]
  try {
    rows = JSON.parse(rowsRaw)
  } catch {
    return { error: 'Invalid import data.' }
  }

  if (!Array.isArray(rows) || rows.length === 0) return { error: 'No rows to import.' }

  const records = []
  for (const [i, row] of rows.entries()) {
    const n = i + 1
    if (!row.title?.trim()) return { error: `Row ${n}: title is required.` }
    if (!VALID_TYPES.includes(row.associate_type)) return { error: `Row ${n}: invalid associate_type "${row.associate_type}".` }

    let persona: unknown
    let rubric: unknown
    try { persona = JSON.parse(row.persona) } catch { return { error: `Row ${n}: persona is not valid JSON.` } }
    try { rubric = JSON.parse(row.rubric) } catch { return { error: `Row ${n}: rubric is not valid JSON.` } }

    records.push({
      title: row.title.trim(),
      description: row.description?.trim() || null,
      associate_type: row.associate_type,
      persona,
      rubric,
      tenant_id: profile.tenant_id,
      created_by: user.id,
      is_active: true,
    })
  }

  const { error } = await supabase.from('scenarios').insert(records)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
