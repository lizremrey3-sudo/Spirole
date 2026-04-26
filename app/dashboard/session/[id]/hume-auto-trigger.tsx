'use client'

import { useEffect, useState } from 'react'
import VocalDeliveryPanel from './vocal-delivery-panel'

type VocalScores = {
  confidence: number
  warmth: number
  hesitation: number
  enthusiasm: number
}

type State = 'loading' | 'done' | 'error' | 'no-audio'

export default function HumeAutoTrigger({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>('loading')
  const [scores, setScores] = useState<VocalScores | null>(null)

  useEffect(() => {
    let cancelled = false
    console.log('[HumeAutoTrigger] Triggering vocal analysis for session', sessionId)
    fetch(`/api/session/${sessionId}/hume`, { method: 'POST' })
      .then(async res => {
        if (cancelled) return
        console.log('[HumeAutoTrigger] Response status:', res.status)
        if (res.status === 404) {
          console.log('[HumeAutoTrigger] No audio found for session')
          setState('no-audio')
          return
        }
        if (!res.ok) {
          const text = await res.text()
          console.error('[HumeAutoTrigger] Error response:', res.status, text)
          setState('error')
          return
        }
        const data = await res.json() as { scores?: VocalScores; error?: string }
        console.log('[HumeAutoTrigger] Result:', data)
        if (data.scores) {
          setScores(data.scores)
          setState('done')
        } else {
          console.error('[HumeAutoTrigger] No scores in response:', data.error)
          setState('error')
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[HumeAutoTrigger] Fetch error:', err)
          setState('error')
        }
      })
    return () => { cancelled = true }
  }, [sessionId])

  if (state === 'no-audio') return null

  if (state === 'loading') {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-8 text-center">
        <p className="animate-pulse text-sm text-white/40">Analyzing vocal delivery…</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-4 text-center">
        <p className="text-sm text-white/40">Vocal analysis unavailable for this session.</p>
      </div>
    )
  }

  if (scores) return <VocalDeliveryPanel scores={scores} />
  return null
}
