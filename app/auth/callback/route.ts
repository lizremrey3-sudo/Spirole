import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  console.log('[callback] params:', {
    code: code ? `${code.slice(0, 8)}…` : null,
    token_hash: token_hash ? `${token_hash.slice(0, 8)}…` : null,
    type,
    error: searchParams.get('error'),
  })

  if (searchParams.get('error')) {
    return NextResponse.redirect(new URL('/sign-in?error=link_expired', request.url))
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[callback] exchangeCodeForSession:', error ? `error: ${error.message}` : 'ok')
    if (error) return NextResponse.redirect(new URL('/sign-in?error=link_expired', request.url))
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email_change',
    })
    console.log('[callback] verifyOtp type=%s:', type, error ? `error: ${error.message}` : 'ok')
    if (error) return NextResponse.redirect(new URL('/sign-in?error=link_expired', request.url))
  } else {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  console.log('[callback] user:', user ? `id=${user.id} email=${user.email}` : 'null')
  if (!user) return NextResponse.redirect(new URL('/sign-in', request.url))

  const isInvite = type === 'invite' || !!user.user_metadata?.tenant_id
  const isRecovery = type === 'recovery'

  // For invite flows, create the profile row now (before /welcome) so the
  // dashboard can load without needing to know about invite metadata.
  if (isInvite) {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) {
      const tenantId = user.user_metadata?.tenant_id as string
      const role = (user.user_metadata?.role as string) || 'rep'

      const { error: insertError } = await admin.from('users').insert({
        id: user.id,
        tenant_id: tenantId,
        role,
        email: user.email,
      })
      console.log('[callback] profile insert:', insertError ? `error: ${insertError.message}` : 'ok')

      if (user.email) {
        await admin
          .from('invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('email', user.email)
          .is('accepted_at', null)
      }
    }

    return NextResponse.redirect(new URL('/welcome', request.url))
  }

  if (isRecovery) {
    return NextResponse.redirect(new URL('/welcome', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
