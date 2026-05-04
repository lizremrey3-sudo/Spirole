'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveGooglePlaceId(placeId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Admin only' }

  const trimmed = placeId.trim()
  if (!trimmed) return { error: 'Place ID is required' }

  const { error } = await createAdminClient()
    .from('practice_integrations')
    .upsert(
      { tenant_id: profile.tenant_id, source: 'google_reviews', config: { place_id: trimmed } },
      { onConflict: 'tenant_id,source' }
    )

  if (error) return { error: error.message }
  return {}
}
