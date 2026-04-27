'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error?: string; message?: string } | null

export async function inviteUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string | null)?.trim()
  const role = (formData.get('role') as string) || 'rep'
  const practiceName = (formData.get('practice_name') as string | null)?.trim() || undefined

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  const admin = createAdminClient()
  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: profile.tenant_id, role, practice_name: practiceName },
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) return { error: error.message }

  await admin.from('invitations').upsert(
    {
      tenant_id: profile.tenant_id,
      email,
      role,
      practice_name: practiceName ?? null,
      invited_by: user.id,
      auth_user_id: inviteData.user.id,
      created_at: new Date().toISOString(),
      accepted_at: null,
    },
    { onConflict: 'tenant_id,email', ignoreDuplicates: false }
  )

  return { message: `Invite sent to ${email}.` }
}

export async function resendInvite(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string | null)?.trim()
  const role = (formData.get('role') as string) || 'rep'
  const practiceName = (formData.get('practice_name') as string | null)?.trim() || undefined

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
    return { error: 'Not authorized.' }
  }

  const admin = createAdminClient()

  // Delete the existing pending auth user so inviteUserByEmail can recreate them
  const { data: existing } = await admin
    .from('invitations')
    .select('auth_user_id')
    .eq('tenant_id', profile.tenant_id)
    .eq('email', email)
    .is('accepted_at', null)
    .maybeSingle()

  if (existing?.auth_user_id) {
    await admin.auth.admin.deleteUser(existing.auth_user_id as string)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: profile.tenant_id, role, practice_name: practiceName },
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) return { error: error.message }

  await admin
    .from('invitations')
    .update({
      auth_user_id: inviteData.user.id,
      created_at: new Date().toISOString(),
      invited_by: user.id,
    })
    .eq('tenant_id', profile.tenant_id)
    .eq('email', email)
    .is('accepted_at', null)

  return { message: `Invite resent to ${email}.` }
}
