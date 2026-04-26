'use client'

import { useRouter } from 'next/navigation'

type Practice = { id: string; name: string }

export default function PracticeSelector({
  practices,
  selectedId,
}: {
  practices: Practice[]
  selectedId: string | null
}) {
  const router = useRouter()

  if (practices.length === 0) {
    return <span className="text-sm text-white/40">No practice assigned</span>
  }

  if (practices.length === 1) {
    return <span className="text-sm font-medium text-white">{practices[0].name}</span>
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={e => router.push(`?practice=${e.target.value}`)}
      className="rounded-md border border-white/10 bg-[#111827] px-3 py-1.5 text-sm font-medium text-white focus:border-[#2dd4bf]/60 focus:outline-none focus:ring-1 focus:ring-[#2dd4bf]/40"
    >
      {practices.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
