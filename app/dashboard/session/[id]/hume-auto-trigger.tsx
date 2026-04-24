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
    fetch(`/api/session/${sessionId}/hume`, { method: 'POST' })
      .then(async res => {
        if (cancelled) return
        if (res.status === 404) { setState('no-audio'); return }
        if (!res.ok) { setState('error'); return }
        const data = await res.json() as { scores?: VocalScores; error?: string }
        if (data.scores) { setScores(data.scores); setState('done') }
        else setState('error')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [sessionId])

  if (state === 'no-audio') return null

  if (state === 'loading') {
    return (
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Vocal Delivery</h2>
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-8 text-center">
          <p className="text-sm text-zinc-400 animate-pulse">Analyzing vocal delivery…</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Vocal Delivery</h2>
        <p className="text-sm text-zinc-400">Vocal analysis unavailable for this session.</p>
      </div>
    )
  }

  if (scores) return <VocalDeliveryPanel scores={scores} />
  return null
}
