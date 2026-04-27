import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const HUME_API_KEY = process.env.HUME_API_KEY
const HUME_BASE = 'https://api.hume.ai/v0/batch'

type VocalScores = {
  confidence:  number
  warmth:      number
  hesitation:  number
  enthusiasm:  number
}

// Hume prosody returns ~48 specific emotions (softmax probabilities summing to ~1).
// "Confidence" and "Warmth" are not Hume emotion names — map real names to our dimensions.
// Multiple emotions per dimension are averaged per segment for a more robust signal.
const DIMENSION_EMOTIONS: Record<keyof VocalScores, string[]> = {
  confidence: ['Determination', 'Pride', 'Triumph'],
  warmth:     ['Joy', 'Contentment', 'Sympathy'],
  hesitation: ['Confusion', 'Doubt', 'Anxiety'],
  enthusiasm: ['Enthusiasm', 'Excitement', 'Amusement'],
}

type HumeEmotion = { name: string; score: number }
type HumePrediction = { emotions: HumeEmotion[] }
type HumeSegmentPrediction = { models: { prosody: { grouped_predictions: { predictions: HumePrediction[] }[] } } }
type HumeFileResult = {
  results?: { predictions: HumeSegmentPrediction[] }
  predictions?: HumeSegmentPrediction[]
}

function extractScores(files: HumeFileResult[]): VocalScores | null {
  const sums: Record<keyof VocalScores, number> = { confidence: 0, warmth: 0, hesitation: 0, enthusiasm: 0 }
  let count = 0

  for (const file of files) {
    const preds = file.results?.predictions ?? file.predictions ?? []
    for (const pred of preds) {
      const prosody = pred.models?.prosody
      if (!prosody) continue
      for (const group of prosody.grouped_predictions ?? []) {
        for (const segment of group.predictions ?? []) {
          const emotions = segment.emotions ?? []
          // Normalise each segment against its dominant emotion so scores reflect
          // relative strength rather than absolute probability magnitude.
          const maxScore = emotions.reduce((m, e) => Math.max(m, e.score), 0)
          if (maxScore === 0) continue

          const byName = new Map(emotions.map(e => [e.name, e.score / maxScore]))

          for (const [dim, names] of Object.entries(DIMENSION_EMOTIONS) as [keyof VocalScores, string[]][]) {
            const vals = names.map(n => byName.get(n) ?? 0)
            sums[dim] += vals.reduce((a, b) => a + b, 0) / vals.length
          }
          count++
        }
      }
    }
  }

  if (count === 0) return null

  // sqrt amplification: normalised avg ~0.16–0.49 → scores ~4–7
  const toScore = (avg: number) => Math.min(Math.round(Math.sqrt(avg) * 100) / 10, 10)

  return {
    confidence: toScore(sums.confidence / count),
    warmth:     toScore(sums.warmth / count),
    hesitation: toScore(sums.hesitation / count),
    enthusiasm: toScore(sums.enthusiasm / count),
  }
}

async function humeGet(path: string) {
  const res = await fetch(`${HUME_BASE}${path}`, {
    headers: { 'X-Hume-Api-Key': HUME_API_KEY! },
  })
  if (!res.ok) throw new Error(`Hume ${path} failed: ${res.status}`)
  return res.json()
}

async function humePost(path: string, body: unknown) {
  const res = await fetch(`${HUME_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': HUME_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Hume ${path} failed: ${res.status}`)
  return res.json()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  console.log('[Hume] POST /api/session/' + sessionId + '/hume')

  if (!HUME_API_KEY) {
    console.error('[Hume] HUME_API_KEY not set')
    return new Response('Hume API not configured', { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id, feedback')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    console.error('[Hume] Session not found:', sessionId)
    return new Response('Session not found', { status: 404 })
  }

  const admin = createAdminClient()

  const { data: signedUrl, error: signedUrlError } = await admin.storage
    .from('session-audio')
    .createSignedUrl(`${sessionId}.webm`, 900)

  console.log('[Hume] Signed URL result:', { signedUrl: !!signedUrl?.signedUrl, error: signedUrlError?.message })

  if (signedUrlError || !signedUrl?.signedUrl) {
    return new Response('No audio found', { status: 404 })
  }

  let scores: VocalScores | null = null

  try {
    console.log('[Hume] Submitting batch job...')
    const job = await humePost('/jobs', {
      models: { prosody: {} },
      urls: [signedUrl.signedUrl],
    }) as { job_id: string }

    const jobId = job.job_id
    console.log('[Hume] Job submitted:', jobId)

    let done = false
    for (let attempt = 0; attempt < 24 && !done; attempt++) {
      await new Promise(r => setTimeout(r, 5000))
      const status = await humeGet(`/jobs/${jobId}`) as { state: { status: string } }
      console.log('[Hume] Poll attempt', attempt + 1, '— status:', status.state?.status)
      if (status.state?.status === 'COMPLETED') {
        done = true
      } else if (status.state?.status === 'FAILED') {
        throw new Error('Hume job failed')
      }
    }

    if (!done) throw new Error('Hume job timed out')

    const predictions = await humeGet(`/jobs/${jobId}/predictions`) as HumeFileResult[]
    console.log('[Hume] Raw predictions shape:', JSON.stringify(predictions?.[0]).slice(0, 300))
    scores = extractScores(predictions)
    console.log('[Hume] Extracted scores:', scores)
  } catch (err) {
    console.error('[Hume] Analysis error:', err)
    return new Response(JSON.stringify({ error: 'Vocal analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!scores) {
    return new Response(JSON.stringify({ error: 'No prosody data in audio' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Merge vocal_delivery into existing feedback
  let existingFeedback: Record<string, unknown> = {}
  try {
    if (session.feedback) {
      existingFeedback = JSON.parse(session.feedback as string) as Record<string, unknown>
    }
  } catch { /* ignore */ }

  const updatedFeedback = JSON.stringify({
    ...existingFeedback,
    vocal_delivery: { ...scores, analyzed_at: new Date().toISOString() },
  })

  await supabase
    .from('sessions')
    .update({ feedback: updatedFeedback })
    .eq('id', sessionId)

  return new Response(JSON.stringify({ scores }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
