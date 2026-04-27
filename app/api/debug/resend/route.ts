import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 })

  const log: Record<string, unknown> = { email }
  const admin = createAdminClient()

  // Step 1: look up invitations row
  const { data: invitation, error: invErr } = await admin
    .from('invitations')
    .select('id, email, role, practice_name, auth_user_id, created_at, accepted_at')
    .eq('email', email)
    .maybeSingle()
  log.step1_invitation = { data: invitation, error: invErr?.message ?? null }

  // Step 2: list auth users and find by email
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const matchedUsers = listData?.users?.filter(u => u.email === email) ?? []
  log.step2_listUsers = {
    error: listErr?.message ?? null,
    totalFetched: listData?.users?.length ?? 0,
    matched: matchedUsers.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      confirmed_at: u.confirmed_at,
      invited_at: u.invited_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
  }

  // Step 3: attempt delete (use auth_user_id from invitations if available, else matched user)
  const authUserId = (invitation?.auth_user_id as string | null) ?? matchedUsers[0]?.id ?? null
  log.step3_deleteTarget = { authUserId }

  if (authUserId) {
    const { error: deleteErr } = await admin.auth.admin.deleteUser(authUserId)
    log.step3_deleteResult = { error: deleteErr?.message ?? null, success: !deleteErr }
  } else {
    log.step3_deleteResult = { skipped: true, reason: 'no auth user found to delete' }
  }

  // Step 4: attempt re-invite
  const role = (invitation?.role as string) || 'rep'
  const practiceName = (invitation?.practice_name as string | null) ?? undefined
  const tenantId = invitation ? (invitation as Record<string, unknown>).tenant_id : null

  // Need tenant_id — re-fetch with it
  const { data: invWithTenant } = await admin
    .from('invitations')
    .select('tenant_id')
    .eq('email', email)
    .maybeSingle()
  const resolvedTenantId = (invWithTenant?.tenant_id as string | null) ?? null

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'
  log.step4_invitePayload = { email, role, practiceName, tenantId: resolvedTenantId, redirectTo: `${baseUrl}/auth/callback` }

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: resolvedTenantId, role, practice_name: practiceName },
    redirectTo: `${baseUrl}/auth/callback`,
  })
  log.step4_inviteResult = {
    error: inviteErr?.message ?? null,
    userId: inviteData?.user?.id ?? null,
    userEmail: inviteData?.user?.email ?? null,
    success: !inviteErr,
  }

  // Step 5: update invitations row with new auth_user_id
  if (!inviteErr && inviteData?.user?.id && resolvedTenantId) {
    const { error: updateErr } = await admin
      .from('invitations')
      .update({ auth_user_id: inviteData.user.id, created_at: new Date().toISOString() })
      .eq('tenant_id', resolvedTenantId)
      .eq('email', email)
      .is('accepted_at', null)
    log.step5_updateInvitation = { error: updateErr?.message ?? null, success: !updateErr }
  } else {
    log.step5_updateInvitation = { skipped: true, reason: 'invite failed or missing data' }
  }

  console.log('[debug/resend]', JSON.stringify(log, null, 2))
  return NextResponse.json(log)
}
