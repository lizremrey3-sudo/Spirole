import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PlaceResponse = { rating?: number; userRatingCount?: number; error?: { message: string } }

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createAdminClient()

  const { data: integrations, error: intError } = await admin
    .from('practice_integrations')
    .select('tenant_id, config')
    .eq('source', 'google_reviews')

  if (intError) {
    return new Response(JSON.stringify({ error: intError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const results: { tenantId: string; status: string; error?: string }[] = []

  for (const integration of integrations ?? []) {
    const placeId = (integration.config as { place_id?: string }).place_id
    if (!placeId) {
      results.push({ tenantId: integration.tenant_id, status: 'skipped' })
      continue
    }

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=rating,userRatingCount&key=${apiKey}`
      )
      const place = await res.json() as PlaceResponse

      if (!res.ok) {
        results.push({ tenantId: integration.tenant_id, status: 'error', error: place.error?.message ?? `HTTP ${res.status}` })
        continue
      }

      const rows = []
      if (place.rating != null) {
        rows.push({ tenant_id: integration.tenant_id, source: 'google_reviews', metric_name: 'star_rating', metric_value: place.rating, recorded_date: today })
      }
      if (place.userRatingCount != null) {
        rows.push({ tenant_id: integration.tenant_id, source: 'google_reviews', metric_name: 'review_count', metric_value: place.userRatingCount, recorded_date: today })
      }

      if (rows.length === 0) {
        results.push({ tenantId: integration.tenant_id, status: 'skipped', error: 'No rating data in Places API response' })
        continue
      }

      const { error: upsertError } = await admin
        .from('external_metrics')
        .upsert(rows, { onConflict: 'tenant_id,source,metric_name,recorded_date' })

      results.push(upsertError
        ? { tenantId: integration.tenant_id, status: 'error', error: upsertError.message }
        : { tenantId: integration.tenant_id, status: 'ok' })
    } catch (err) {
      results.push({ tenantId: integration.tenant_id, status: 'error', error: String(err) })
    }
  }

  return new Response(JSON.stringify({ synced: results.filter(r => r.status === 'ok').length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
