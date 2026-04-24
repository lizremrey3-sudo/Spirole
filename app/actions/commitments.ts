'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

type ActionState = { error?: string; message?: string } | null

export async function saveCommitment(_: ActionState, formData: FormData): Promise<ActionState> {
  const prompt = (formData.get('prompt') as string | null)?.trim()
  const response = (formData.get('response') as string | null)?.trim()

  if (!prompt) return { error: 'No prompt selected.' }
  if (!response) return { error: 'Please write a response.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }

  const admin = createAdminClient()
  const { error } = await admin.from('commitments').insert({
    user_id: user.id,
    tenant_id: profile.tenant_id,
    prompt,
    response,
  })

  if (error) return { error: error.message }
  return { message: 'Commitment saved.' }
}
