'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { savePerformanceMetrics } from '@/app/actions/performance-metrics'

type MetricEntry = { week_number: number; metric_name: string; metric_value: number }

const METRICS = [
  { key: 'retinal_imaging_attachment_rate', label: 'Retinal Imaging Attachment Rate', unit: '%' },
  { key: 'same_day_conversion_rate',        label: 'Same-Day Conversion Rate',         unit: '%' },
  { key: 'contact_lens_capture_rate',       label: 'Contact Lens Capture Rate',        unit: '%' },
  { key: 'average_transaction_value',       label: 'Average Transaction Value',        unit: '$' },
  { key: 'patient_satisfaction',            label: 'Patient Satisfaction',             unit: '/5' },
] as const

type MetricKey = (typeof METRICS)[number]['key']

type MetricData = Record<MetricKey, (number | null)[]>

function initData(existing: MetricEntry[]): MetricData {
  const d = {} as MetricData
  for (const m of METRICS) {
    d[m.key] = [null, null, null, null]
  }
  for (const e of existing) {
    const arr = d[e.metric_name as MetricKey]
    if (arr && e.week_number >= 1 && e.week_number <= 4) {
      arr[e.week_number - 1] = e.metric_value
    }
  }
  return d
}

function getTrend(vals: (number | null)[]): 'up' | 'down' | 'flat' | 'none' {
  const filled = vals.filter((v): v is number => v !== null)
  if (filled.length < 2) return 'none'
  const diff = filled[filled.length - 1] - filled[0]
  if (diff > 0) return 'up'
  if (diff < 0) return 'down'
  return 'flat'
}

export default function PerformanceMetrics({ existing }: { existing: MetricEntry[] }) {
  const [data, setData] = useState<MetricData>(() => initData(existing))
  const [state, action, isPending] = useActionState(savePerformanceMetrics, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state?.message])

  function setValue(metricKey: MetricKey, weekIdx: number, raw: string) {
    setData(prev => {
      const arr = [...prev[metricKey]] as (number | null)[]
      arr[weekIdx] = raw === '' ? null : Number(raw)
      return { ...prev, [metricKey]: arr }
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">My Performance Metrics</h2>
      <p className="mb-5 text-sm text-white/50">
        Log your real-world practice metrics across 4 consecutive weeks to track improvement.
      </p>

      {state?.error && (
        <p className="mb-4 rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state?.message && (
        <p className="mb-4 rounded-md bg-[#2dd4bf]/10 px-3 py-2 text-sm text-[#2dd4bf]">{state.message}</p>
      )}

      <form action={action}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-3 pr-4 text-left text-xs font-medium text-white/40">Metric</th>
                {[1, 2, 3, 4].map(w => (
                  <th key={w} className="px-2 pb-3 text-center text-xs font-medium text-white/40">
                    Week {w}
                  </th>
                ))}
                <th className="px-2 pb-3 text-center text-xs font-medium text-white/40">Trend</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(metric => {
                const trend = getTrend(data[metric.key])
                return (
                  <tr key={metric.key} className="border-t border-white/[0.06]">
                    <td className="py-3 pr-4">
                      <p className="text-xs font-medium leading-tight text-white/70">{metric.label}</p>
                      <p className="text-xs text-white/30">{metric.unit}</p>
                    </td>
                    {[0, 1, 2, 3].map(weekIdx => (
                      <td key={weekIdx} className="px-2 py-3 text-center">
                        <input
                          type="number"
                          name={`w${weekIdx + 1}_${metric.key}`}
                          min={0}
                          max={metric.unit === '/5' ? 5 : metric.unit === '%' ? 100 : undefined}
                          step={metric.unit === '/5' ? 0.1 : metric.unit === '$' ? 0.01 : 0.1}
                          value={data[metric.key][weekIdx] ?? ''}
                          onChange={e => setValue(metric.key, weekIdx, e.target.value)}
                          placeholder="—"
                          className="w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-xs text-white outline-none placeholder-white/20 focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center">
                      {trend === 'none' && <span className="text-xs text-white/30">—</span>}
                      {trend === 'up'   && <span className="text-xs font-semibold text-green-400">↑</span>}
                      {trend === 'down' && <span className="text-xs font-semibold text-red-400">↓</span>}
                      {trend === 'flat' && <span className="text-xs font-semibold text-white/40">→</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#2dd4bf] px-5 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save metrics'}
          </button>
        </div>
      </form>
    </div>
  )
}
