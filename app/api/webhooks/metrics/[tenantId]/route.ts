import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params

  if (!UUID_RE.test(tenantId)) return err('Invalid tenant ID')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON')
  }

  const { practice_id, source, metric_name, metric_value, recorded_date } =
    body as Record<string, unknown>

  if (!source || typeof source !== 'string' || !source.trim())
    return err('source is required')
  if (!metric_name || typeof metric_name !== 'string' || !metric_name.trim())
    return err('metric_name is required')
  if (metric_value == null || typeof metric_value !== 'number' || !isFinite(metric_value))
    return err('metric_value must be a finite number')
  if (!recorded_date || typeof recorded_date !== 'string' || !DATE_RE.test(recorded_date))
    return err('recorded_date must be YYYY-MM-DD')
  if (practice_id != null && (typeof practice_id !== 'string' || !UUID_RE.test(practice_id)))
    return err('practice_id must be a valid UUID')

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant) return err('Tenant not found', 404)

  const { error: upsertError } = await admin
    .from('external_metrics')
    .upsert(
      {
        tenant_id: tenantId,
        practice_id: practice_id ?? null,
        source: source.trim(),
        metric_name: metric_name.trim(),
        metric_value,
        recorded_date,
      },
      { onConflict: 'tenant_id,source,metric_name,recorded_date' }
    )

  if (upsertError) {
    console.error('[webhook/metrics] upsert error:', upsertError)
    return err('Failed to save metric', 500)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
