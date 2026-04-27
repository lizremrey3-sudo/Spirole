import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/sign-in?error=auth', request.url))
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email_change',
    })
    if (error) return NextResponse.redirect(new URL('/sign-in?error=auth', request.url))
  } else {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in', request.url))

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  let tenantId: string

  if (!profile) {
    // Invited user — build profile from invite metadata
    const metaTenantId = user.user_metadata?.tenant_id as string | undefined
    const metaRole = (user.user_metadata?.role as string) || 'rep'
    const metaPracticeName = user.user_metadata?.practice_name as string | undefined

    if (!metaTenantId) {
      return NextResponse.redirect(new URL('/sign-in?error=missing_tenant', request.url))
    }

    // Find or create the practice if one was specified in the invite
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
      } else {
        const { data: created } = await admin
          .from('practices')
          .insert({ tenant_id: metaTenantId, name: metaPracticeName })
          .select('id')
          .single()
        practiceId = (created?.id as string) ?? null
      }
    }

    const { error: profileError } = await admin.from('users').insert({
      id: user.id,
      tenant_id: metaTenantId,
      role: metaRole,
      email: user.email,
      practice_id: practiceId,
    })

    if (profileError) {
      return NextResponse.redirect(new URL('/sign-in?error=profile', request.url))
    }

    tenantId = metaTenantId
  } else {
    tenantId = profile.tenant_id
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('status')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (sub?.status === 'active' || sub?.status === 'pilot') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/pricing', request.url))
}
