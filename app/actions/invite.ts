'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInviteEmail } from '@/lib/email'

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

  const admin = createAdminClient()
  const tenantId = profile.tenant_id as string
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  // Check for an existing invitation for this email in this tenant
  const { data: existing } = await admin
    .from('invitations')
    .select('id, accepted_at, auth_user_id')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .maybeSingle()

  if (existing?.accepted_at) {
    return { error: 'This person is already a member of your team.' }
  }

  const token = randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  let authUserId: string

  if (existing) {
    // Pending invitation exists — reuse the auth user, just refresh the token
    authUserId = existing.auth_user_id as string
    await admin
      .from('invitations')
      .update({ token, token_expires_at: tokenExpiresAt, role, practice_name: practiceName ?? null, invited_by: user.id, created_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    // New invite — create the auth user with a random password (user will set their own via /join)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        return { error: 'An account with this email already exists.' }
      }
      return { error: createError.message }
    }

    authUserId = created.user.id

    const { error: insertError } = await admin.from('invitations').insert({
      tenant_id: tenantId,
      email,
      role,
      practice_name: practiceName ?? null,
      invited_by: user.id,
      auth_user_id: authUserId,
      token,
      token_expires_at: tokenExpiresAt,
    })

    if (insertError) {
      // Roll back the auth user if the invitation insert failed
      await admin.auth.admin.deleteUser(authUserId)
      return { error: insertError.message }
    }
  }

  try {
    await sendInviteEmail({
      to: email,
      invitedByEmail: user.email ?? 'your team admin',
      joinUrl: `${baseUrl}/join?token=${token}`,
    })
  } catch (err) {
    return { error: `User created but email failed to send: ${(err as Error).message}` }
  }

  return { message: `Invite sent to ${email}.` }
}

export async function resendInvite(invitationId: string): Promise<{ error?: string; message?: string }> {
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

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, tenant_id, accepted_at')
    .eq('id', invitationId)
    .eq('tenant_id', profile.tenant_id as string)
    .maybeSingle()

  if (!invitation) return { error: 'Invitation not found.' }
  if (invitation.accepted_at) return { error: 'This invitation has already been accepted.' }

  const token = randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await admin
    .from('invitations')
    .update({ token, token_expires_at: tokenExpiresAt, created_at: new Date().toISOString() })
    .eq('id', invitationId)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  try {
    await sendInviteEmail({
      to: invitation.email as string,
      invitedByEmail: user.email ?? 'your team admin',
      joinUrl: `${baseUrl}/join?token=${token}`,
    })
  } catch (err) {
    return { error: `Token refreshed but email failed to send: ${(err as Error).message}` }
  }

  return { message: `Invite resent to ${invitation.email}.` }
}
