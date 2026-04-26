const COLORS = ['#2dd4bf', '#818cf8', '#fb923c', '#f472b6', '#34d399', '#60a5fa']

type PracticeWeeklyData = {
  id: string
  name: string
  weeklyAvgs: (number | null)[]
}

const W = 700
const H = 220
const PAD = { top: 20, right: 20, bottom: 56, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function toX(i: number, total: number) {
  if (total <= 1) return PAD.left + PLOT_W / 2
  return PAD.left + (i / (total - 1)) * PLOT_W
}
function toY(val: number) {
  return PAD.top + (1 - val / 100) * PLOT_H
}

export default function PracticeTrendChart({
  practices,
  weekLabels,
}: {
  practices: PracticeWeeklyData[]
  weekLabels: string[]
}) {
  const total = weekLabels.length

  return (
    <div>
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
        {weekLabels.map((label, i) => (
          <text key={i} x={toX(i, total)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">
            {label}
          </text>
        ))}

        {/* One polyline per practice */}
        {practices.map((p, pi) => {
          const color = COLORS[pi % COLORS.length]
          const segments: { x: number; y: number }[][] = []
          let current: { x: number; y: number }[] = []
          p.weeklyAvgs.forEach((avg, i) => {
            if (avg === null) {
              if (current.length) { segments.push(current); current = [] }
            } else {
              current.push({ x: toX(i, total), y: toY(avg) })
            }
          })
          if (current.length) segments.push(current)

          return (
            <g key={p.id}>
              {segments.map((seg, si) =>
                seg.length > 1 ? (
                  <polyline
                    key={si}
                    points={seg.map(pt => `${pt.x},${pt.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}
              {p.weeklyAvgs.map((avg, i) =>
                avg !== null ? (
                  <circle key={i} cx={toX(i, total)} cy={toY(avg)} r={3.5} fill={color} />
                ) : null
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 px-1">
        {practices.map((p, pi) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[pi % COLORS.length] }}
            />
            <span className="text-xs text-white/50">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
