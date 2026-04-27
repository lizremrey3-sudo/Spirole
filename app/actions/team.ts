'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role as string)) {
    return { error: 'Not authorized.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spiroletrainer.com'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) return { error: error.message }
  return {}
}

export async function deactivateUser(userId: string): Promise<{ error?: string }> {
  return setUserActive(userId, false)
}

export async function reactivateUser(userId: string): Promise<{ error?: string }> {
  return setUserActive(userId, true)
}

async function setUserActive(userId: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (userId === user.id) return { error: 'You cannot change your own active status.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return { error: 'Only admins can change user status.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .eq('tenant_id', profile.tenant_id as string)

  if (error) return { error: error.message }
  return {}
}
