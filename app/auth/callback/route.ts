import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  console.log('[callback] params:', { code: code ? `${code.slice(0, 8)}…` : null, token_hash: token_hash ? `${token_hash.slice(0, 8)}…` : null, type, error: errorParam })

  if (errorParam) {
    console.log('[callback] error param received:', errorParam, errorDescription)
    return NextResponse.redirect(new URL('/sign-in?error=link_expired', request.url))
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[callback] exchangeCodeForSession:', error ? `error: ${error.message}` : 'ok')
    if (error) return NextResponse.redirect(new URL('/sign-in?error=auth', request.url))
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email_change',
    })
    console.log('[callback] verifyOtp type=%s:', type, error ? `error: ${error.message}` : 'ok')
    if (error) return NextResponse.redirect(new URL('/sign-in?error=auth', request.url))
  } else {
    console.log('[callback] no code or token_hash — redirecting to sign-in')
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()
  console.log('[callback] getUser:', getUserError ? `error: ${getUserError.message}` : `id=${user?.id} email=${user?.email}`)
  if (!user) return NextResponse.redirect(new URL('/sign-in', request.url))

  console.log('[callback] user_metadata:', JSON.stringify(user.user_metadata))

  // Password reset — send straight to set-password regardless of profile state
  if (type === 'recovery') {
    console.log('[callback] recovery flow — redirecting to /auth/set-password')
    return NextResponse.redirect(new URL('/auth/set-password', request.url))
  }

  const admin = createAdminClient()

  const { data: profile, error: profileLookupError } = await admin
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  console.log('[callback] profile lookup:', profileLookupError ? `error: ${profileLookupError.message}` : profile ? `tenant_id=${profile.tenant_id}` : 'no profile (new invited user)')

  if (!profile) {
    const metaTenantId = user.user_metadata?.tenant_id as string | undefined
    const metaRole = (user.user_metadata?.role as string) || 'rep'
    const metaPracticeName = user.user_metadata?.practice_name as string | undefined

    console.log('[callback] invite metadata:', { metaTenantId, metaRole, metaPracticeName })

    if (!metaTenantId) {
      console.log('[callback] missing tenant_id in metadata — redirecting to error')
      return NextResponse.redirect(new URL('/sign-in?error=missing_tenant', request.url))
    }

    let practiceId: string | null = null
    if (metaPracticeName) {
      const { data: existing } = await admin
        .from('practices')
        .select('id')
        .eq('tenant_id', metaTenantId)
        .eq('name', metaPracticeName)
        .maybeSingle()

      if (existing) {
        practiceId = existing.id as string
        console.log('[callback] found existing practice:', practiceId)
      } else {
        const { data: created, error: practiceError } = await admin
          .from('practices')
          .insert({ tenant_id: metaTenantId, name: metaPracticeName })
          .select('id')
          .single()
        practiceId = (created?.id as string) ?? null
        console.log('[callback] created practice:', practiceError ? `error: ${practiceError.message}` : practiceId)
      }
    }

    const { error: profileError } = await admin.from('users').insert({
      id: user.id,
      tenant_id: metaTenantId,
      role: metaRole,
      email: user.email,
      practice_id: practiceId,
    })

    console.log('[callback] profile insert:', profileError ? `error: ${profileError.message}` : 'ok')

    if (profileError) {
      return NextResponse.redirect(new URL('/sign-in?error=profile', request.url))
    }

    if (user.email) {
      const { error: inviteUpdateError } = await admin
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('tenant_id', metaTenantId)
        .eq('email', user.email)
        .is('accepted_at', null)
      console.log('[callback] mark invitation accepted:', inviteUpdateError ? `error: ${inviteUpdateError.message}` : 'ok')
    }

    console.log('[callback] new invited user — redirecting to /auth/set-password')
    return NextResponse.redirect(new URL('/auth/set-password', request.url))
  }

  // Invited user with existing profile (e.g. PKCE flow where type is absent, or re-clicked link)
  // Detected via tenant_id in user_metadata which is only set by our invite flow
  const isInviteFlow = type === 'invite' || !!user.user_metadata?.tenant_id
  if (isInviteFlow) {
    console.log('[callback] invited user with existing profile — redirecting to /auth/set-password')
    return NextResponse.redirect(new URL('/auth/set-password', request.url))
  }

  const tenantId = profile.tenant_id

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  console.log('[callback] subscription status:', sub?.status ?? 'none')

  if (sub?.status === 'active' || sub?.status === 'pilot') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/pricing', request.url))
}
