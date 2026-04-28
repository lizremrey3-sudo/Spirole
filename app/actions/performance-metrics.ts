'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type ActionState = { error?: string; message?: string } | null

const METRIC_KEYS = [
  'retinal_imaging_attachment_rate',
  'same_day_conversion_rate',
  'contact_lens_capture_rate',
  'average_transaction_value',
  'patient_satisfaction',
] as const

export async function savePerformanceMetrics(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }

  const upserts: {
    user_id: string
    tenant_id: string
    week_number: number
    metric_name: string
    metric_value: number
  }[] = []

  for (const metricKey of METRIC_KEYS) {
    for (let week = 1; week <= 4; week++) {
      const raw = formData.get(`w${week}_${metricKey}`)
      if (!raw || raw === '') continue
      const num = Number(raw)
      if (isNaN(num) || !isFinite(num)) continue
      upserts.push({
        user_id: user.id,
        tenant_id: profile.tenant_id as string,
        week_number: week,
        metric_name: metricKey,
        metric_value: num,
      })
    }
  }

  if (upserts.length === 0) return { error: 'Enter at least one metric value.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('performance_metrics')
    .upsert(upserts, { onConflict: 'user_id,week_number,metric_name' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/think')
  return { message: `Saved ${upserts.length} metric${upserts.length !== 1 ? 's' : ''}.` }
}
