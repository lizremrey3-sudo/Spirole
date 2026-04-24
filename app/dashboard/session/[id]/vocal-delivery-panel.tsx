type VocalScores = {
  confidence: number
  warmth: number
  hesitation: number
  enthusiasm: number
}

const METRICS: { key: keyof VocalScores; label: string; inverted?: boolean }[] = [
  { key: 'confidence',  label: 'Confidence' },
  { key: 'warmth',      label: 'Warmth' },
  { key: 'hesitation',  label: 'Hesitation', inverted: true },
  { key: 'enthusiasm',  label: 'Enthusiasm' },
]

function metricColor(score: number, inverted = false) {
  const effective = inverted ? 10 - score : score
  if (effective >= 7) return { bar: 'bg-green-500', text: 'text-green-700 bg-green-50' }
  if (effective >= 4) return { bar: 'bg-yellow-400', text: 'text-yellow-700 bg-yellow-50' }
  return { bar: 'bg-red-400', text: 'text-red-700 bg-red-50' }
}

export default function VocalDeliveryPanel({ scores }: { scores: VocalScores }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">Vocal Delivery</h2>
      <div className="flex flex-col gap-3">
        {METRICS.map(({ key, label, inverted }) => {
          const score = scores[key]
          const { bar, text } = metricColor(score, inverted)
          return (
            <div key={key} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{label}</p>
                  {inverted && (
                    <p className="mt-0.5 text-xs text-zinc-400">Lower is better</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${text}`}>
                  {score.toFixed(1)}/10
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
