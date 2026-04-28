'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type ActionState = { error?: string; message?: string } | null

export async function saveCoachingNote(_: ActionState, formData: FormData): Promise<ActionState> {
  const sessionId = (formData.get('session_id') as string | null)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim()

  if (!sessionId) return { error: 'Session ID required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role as string)) {
    return { error: 'Not authorized.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('coaching_notes').upsert(
    {
      session_id: sessionId,
      manager_id: user.id,
      tenant_id: profile.tenant_id,
      notes,
    },
    { onConflict: 'session_id,manager_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/session/${sessionId}`)
  return { message: 'Notes saved.' }
}
