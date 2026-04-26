'use client'

import { useState } from 'react'

type Commitment = { id: string; prompt: string; response: string; created_at: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function groupByDate(items: Commitment[]) {
  const map: Record<string, Commitment[]> = {}
  for (const c of items) {
    const key = formatDate(c.created_at)
    ;(map[key] ??= []).push(c)
  }
  return map
}

export default function CommitmentsHistory({ commitments }: { commitments: Commitment[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = groupByDate(commitments)
  const dates = Object.keys(byDate)

  if (dates.length === 0) {
    return <p className="text-sm text-white/40">No saved commitments yet.</p>
  }

  const open = selected ? byDate[selected] : null

  return (
    <>
      <ul className="flex flex-col gap-2">
        {dates.map(date => (
          <li key={date}>
            <button
              onClick={() => setSelected(date)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/5"
            >
              <span className="text-sm font-medium text-white">{date}</span>
              <span className="text-xs text-white/40">
                {byDate[date].length} commitment{byDate[date].length !== 1 ? 's' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-white">{selected}</h3>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {open.map((c, i) => (
                <div key={c.id ?? i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-xs font-semibold text-[#2dd4bf]">{c.prompt}</p>
                  <p className="text-sm leading-relaxed text-white/80">{c.response}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
