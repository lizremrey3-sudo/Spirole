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
  if (effective >= 7) return { bar: 'bg-[#2dd4bf]', text: 'text-green-400 bg-green-500/10' }
  if (effective >= 4) return { bar: 'bg-yellow-400', text: 'text-yellow-400 bg-yellow-500/10' }
  return { bar: 'bg-red-400', text: 'text-red-400 bg-red-500/10' }
}

export default function VocalDeliveryPanel({ scores }: { scores: VocalScores }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-[#2dd4bf]">Vocal Delivery</h2>
      <div className="flex flex-col gap-3">
        {METRICS.map(({ key, label, inverted }) => {
          const score = scores[key]
          const { bar, text } = metricColor(score, inverted)
          return (
            <div key={key} className="rounded-xl border border-white/10 bg-[#111827] p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  {inverted && (
                    <p className="mt-0.5 text-xs text-white/40">Lower is better</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${text}`}>
                  {score.toFixed(1)}/10
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
