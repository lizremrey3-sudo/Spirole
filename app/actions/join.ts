'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ error?: string; message?: string }> {
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, role, tenant_id, auth_user_id, accepted_at, token_expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) return { error: 'This invite link is invalid.' }
  if (invitation.accepted_at) return { error: 'This invite has already been accepted.' }
  if (new Date(invitation.token_expires_at as string) < new Date()) {
    return { error: 'This invite link has expired. Ask your admin to resend the invite.' }
  }

  const { error: pwError } = await admin.auth.admin.updateUserById(
    invitation.auth_user_id as string,
    { password },
  )
  if (pwError) return { error: pwError.message }

  // Create the profile row if it doesn't exist yet
  const { data: existingProfile } = await admin
    .from('users')
    .select('id')
    .eq('id', invitation.auth_user_id as string)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await admin.from('users').insert({
      id: invitation.auth_user_id as string,
      tenant_id: invitation.tenant_id as string,
      role: invitation.role as string,
      email: invitation.email as string,
    })
    if (profileError) return { error: profileError.message }
  }

  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id as string)

  return { message: 'ok' }
}
