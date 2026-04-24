'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error?: string; message?: string } | null

export async function inviteUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string | null)?.trim()
  const role = (formData.get('role') as string) || 'rep'

  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }
  if (!['admin', 'manager'].includes(profile.role)) {
    return { error: 'Only admins and managers can invite users.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? headersList.get('host') ?? 'http://localhost:3000'
  const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: profile.tenant_id, role },
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) return { error: error.message }
  return { message: `Invite sent to ${email}.` }
}
