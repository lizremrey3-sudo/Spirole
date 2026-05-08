'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type CustomizationData = {
  brand_name?: string
  industry?: string
  product_type?: string
  price_point_low?: string
  price_point_high?: string
  difficulty_override?: number | null
  regional_notes?: string
  custom_context?: string
  is_enabled?: boolean
}

export async function upsertScenarioCustomization(
  scenarioId: string,
  data: CustomizationData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role as string)) {
    return { error: 'Not authorized.' }
  }

  const { error } = await supabase
    .from('office_scenario_customizations')
    .upsert(
      { scenario_id: scenarioId, tenant_id: profile.tenant_id, ...data },
      { onConflict: 'scenario_id,tenant_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/scenarios/library')
  return { success: true }
}
