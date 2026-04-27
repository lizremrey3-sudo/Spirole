'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error?: string; message?: string } | null

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const companyName = (formData.get('companyName') as string).trim()

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Sign up failed.' }

  const admin = createAdminClient()
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: companyName, slug })
    .select('id')
    .single()

  if (tenantError) return { error: tenantError.message }

  const { error: userError } = await admin.from('users').insert({
    id: data.user.id,
    tenant_id: tenant.id,
    role: 'admin',
    email,
  })

  if (userError) return { error: userError.message }

  await admin.from('subscriptions').insert({
    tenant_id: tenant.id,
    status: 'inactive',
    plan: 'entry',
  })

  if (!data.session) {
    return { message: 'Check your email to confirm your account, then sign in.' }
  }

  redirect('/pricing')
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string | null)?.trim()
  const password = formData.get('password') as string | null

  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  console.log('[signIn] signInWithPassword:', error ? `error: ${error.message}` : 'ok')

  if (error) return { error: error.message }

  // Verify the session cookie was actually written before we tell the client to navigate.
  // setAll in server.ts silently swallows errors, so we need to confirm here.
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()
  console.log('[signIn] getUser after sign-in:', getUserError ? `error: ${getUserError.message}` : `id=${user?.id}`)

  if (!user) return { error: 'Sign in failed — session could not be created. Please try again.' }

  return { message: 'ok' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function forgotPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get('email') as string).trim()
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) return { error: error.message }
  return { message: 'Check your email for a password reset link.' }
}
