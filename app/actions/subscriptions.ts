'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error?: string; message?: string } | null

export async function applyPromoCode(_: ActionState, formData: FormData): Promise<ActionState> {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase()
  if (!code) return { error: 'Please enter a promo code.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Account not found.' }

  const admin = createAdminClient()
  const { data: promo } = await admin
    .from('promo_codes')
    .select('id, discount_percent, max_uses, uses_count, expires_at')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (!promo) return { error: 'Invalid or inactive promo code.' }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { error: 'This promo code has expired.' }
  }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return { error: 'This promo code has reached its usage limit.' }
  }

  if (promo.discount_percent === 100) {
    const { error: subError } = await admin
      .from('subscriptions')
      .upsert(
        { tenant_id: profile.tenant_id, status: 'pilot', plan: 'entry', promo_code: code },
        { onConflict: 'tenant_id' }
      )

    if (subError) return { error: subError.message }

    await admin
      .from('promo_codes')
      .update({ uses_count: promo.uses_count + 1 })
      .eq('id', promo.id)

    redirect('/dashboard')
  }

  return {
    message: `Code "${code}" gives you ${promo.discount_percent}% off. Enter it at Stripe checkout when selecting a plan below.`,
  }
}
