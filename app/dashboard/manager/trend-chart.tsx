type WeekPoint = { label: string; avg: number | null }

const W = 560
const H = 160
const PAD = { top: 20, right: 16, bottom: 36, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function toX(i: number, total: number) {
  if (total <= 1) return PAD.left + PLOT_W / 2
  return PAD.left + (i / (total - 1)) * PLOT_W
}
function toY(val: number) {
  return PAD.top + (1 - val / 100) * PLOT_H
}

export default function TrendChart({ data }: { data: WeekPoint[] }) {
  const hasAny = data.some(d => d.avg !== null)

  const segments: { x: number; y: number; avg: number }[][] = []
  let current: { x: number; y: number; avg: number }[] = []
  data.forEach((d, i) => {
    if (d.avg === null) {
      if (current.length) { segments.push(current); current = [] }
    } else {
      current.push({ x: toX(i, data.length), y: toY(d.avg), avg: d.avg })
    }
  })
  if (current.length) segments.push(current)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Gridlines */}
      {[0, 25, 50, 75, 100].map(val => {
        const y = toY(val)
        return (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">{val}</text>
          </g>
        )
      })}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i, data.length)} y={H - 6} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">
          {d.label}
        </text>
      ))}

      {/* No data message */}
      {!hasAny && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.3)">
          No session data in this period
        </text>
      )}

      {/* Line segments */}
      {segments.map((seg, si) =>
        seg.length > 1 ? (
          <polyline
            key={si}
            points={seg.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#2dd4bf"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null
      )}

      {/* Points + labels */}
      {segments.flat().map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#2dd4bf" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={10} fontWeight="600" fill="rgba(255,255,255,0.8)">
            {p.avg}
          </text>
        </g>
      ))}
    </svg>
  )
}
