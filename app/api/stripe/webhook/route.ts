import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_PLANS = new Set(['entry', 'strategist', 'elite'])

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return new Response('Missing stripe-signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const ref = session.client_reference_id ?? ''

      // client_reference_id format: "{tenantId}:{planId}"
      const colonIdx = ref.lastIndexOf(':')
      if (colonIdx === -1) {
        console.error('Webhook: missing or malformed client_reference_id', ref)
        break
      }

      const tenantId = ref.slice(0, colonIdx)
      const planId   = ref.slice(colonIdx + 1)

      if (!tenantId || !VALID_PLANS.has(planId)) {
        console.error('Webhook: invalid tenantId or planId', { tenantId, planId })
        break
      }

      if (session.payment_status !== 'paid') break

      const { error } = await admin
        .from('subscriptions')
        .update({
          status: 'active',
          plan: planId as 'entry' | 'strategist' | 'elite',
        })
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Webhook: failed to update subscription', error)
        return new Response('DB update failed', { status: 500 })
      }

      break
    }

    case 'checkout.session.async_payment_failed': {
      // Payment link async payments that fail — nothing to do unless we want to notify
      break
    }

    default:
      // Unhandled event type — return 200 so Stripe doesn't retry
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
