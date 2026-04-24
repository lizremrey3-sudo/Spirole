import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const HUME_API_KEY = process.env.HUME_API_KEY
const HUME_BASE = 'https://api.hume.ai/v0/batch'

// Emotion names in Hume prosody predictions we care about
const EMOTION_MAP: Record<string, keyof VocalScores> = {
  Confidence:  'confidence',
  Warmth:      'warmth',
  Confusion:   'hesitation',  // proxy
  Excitement:  'enthusiasm',
}

type VocalScores = {
  confidence:  number
  warmth:      number
  hesitation:  number
  enthusiasm:  number
}

type HumeEmotion = { name: string; score: number }
type HumePrediction = { emotions: HumeEmotion[] }
type HumeFileResult = { predictions: { models: { prosody: { grouped_predictions: { predictions: HumePrediction[] }[] } } }[] }

function extractScores(predictions: HumeFileResult[]): VocalScores | null {
  const sums: Record<keyof VocalScores, number> = { confidence: 0, warmth: 0, hesitation: 0, enthusiasm: 0 }
  let count = 0

  for (const file of predictions) {
    for (const pred of file.predictions) {
      const prosody = pred.models?.prosody
      if (!prosody) continue
      for (const group of prosody.grouped_predictions ?? []) {
        for (const segment of group.predictions ?? []) {
          for (const emotion of segment.emotions ?? []) {
            const key = EMOTION_MAP[emotion.name]
            if (key) sums[key] += emotion.score
          }
          count++
        }
      }
    }
  }

  if (count === 0) return null

  return {
    confidence:  Math.round((sums.confidence / count) * 10 * 10) / 10,
    warmth:      Math.round((sums.warmth / count) * 10 * 10) / 10,
    hesitation:  Math.round((sums.hesitation / count) * 10 * 10) / 10,
    enthusiasm:  Math.round((sums.enthusiasm / count) * 10 * 10) / 10,
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

  if (!HUME_API_KEY) return new Response('Hume API not configured', { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Verify session ownership and fetch current feedback
  const { data: session } = await supabase
    .from('sessions')
    .select('id, feedback')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return new Response('Session not found', { status: 404 })

  const admin = createAdminClient()

  // Get a signed URL for the audio (valid 15 minutes)
  const { data: signedUrl, error: signedUrlError } = await admin.storage
    .from('session-audio')
    .createSignedUrl(`${sessionId}.webm`, 900)

  if (signedUrlError || !signedUrl?.signedUrl) {
    return new Response('No audio found', { status: 404 })
  }

  let scores: VocalScores | null = null

  try {
    // Submit Hume batch job
    const job = await humePost('/jobs', {
      models: { prosody: {} },
      urls: [signedUrl.signedUrl],
    }) as { job_id: string }

    const jobId = job.job_id

    // Poll for completion (max 120s, every 5s)
    let done = false
    for (let attempt = 0; attempt < 24 && !done; attempt++) {
      await new Promise(r => setTimeout(r, 5000))
      const status = await humeGet(`/jobs/${jobId}`) as { state: { status: string } }
      if (status.state?.status === 'COMPLETED') {
        done = true
      } else if (status.state?.status === 'FAILED') {
        throw new Error('Hume job failed')
      }
    }

    if (!done) throw new Error('Hume job timed out')

    const predictions = await humeGet(`/jobs/${jobId}/predictions`) as HumeFileResult[]
    scores = extractScores(predictions)
  } catch (err) {
    console.error('Hume analysis error:', err)
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
