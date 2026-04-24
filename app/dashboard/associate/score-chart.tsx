'use client'

type Point = { score: number; date: string; label: string }

const W = 560
const H = 180
const PAD = { top: 16, right: 16, bottom: 36, left: 36 }
const iW = W - PAD.left - PAD.right
const iH = H - PAD.top - PAD.bottom

function xAt(i: number, n: number) {
  return PAD.left + (n < 2 ? iW / 2 : (i / (n - 1)) * iW)
}
function yAt(score: number) {
  return PAD.top + iH - (score / 100) * iH
}

export default function ScoreChart({ data }: { data: Point[] }) {
  if (data.length === 0) return null

  const n = data.length
  const pts = data.map((d, i) => ({ ...d, cx: xAt(i, n), cy: yAt(d.score) }))
  const polyline = pts.map(p => `${p.cx},${p.cy}`).join(' ')

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">Score Trend</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {/* Gridlines */}
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={yAt(tick)}
              x2={W - PAD.right} y2={yAt(tick)}
              stroke="#e4e4e7" strokeWidth={1}
            />
            <text x={PAD.left - 6} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#a1a1aa">
              {tick}
            </text>
          </g>
        ))}

        {/* Line (only when ≥2 points) */}
        {n >= 2 && (
          <polyline points={polyline} fill="none" stroke="#18181b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Points + date labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={4} fill="#18181b" />
            <text x={p.cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#a1a1aa">
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
            {/* Score label above point */}
            <text x={p.cx} y={p.cy - 8} textAnchor="middle" fontSize={9} fontWeight="600" fill="#18181b">
              {p.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
