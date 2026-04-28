'use client'

import { useState } from 'react'
import Link from 'next/link'

type Session = {
  id: string
  score: number | null
  completed_at: string
  user_id: string
  userName: string
  userEmail: string
  scenarioTitle: string
  associateType: string
}

const ASSOCIATE_TYPE_LABELS: Record<string, string> = {
  optician: 'Optician',
  technician: 'Technician',
  receptionist: 'Receptionist',
  manager: 'Manager',
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-green-400 bg-green-500/10'
  if (s >= 40) return 'text-yellow-400 bg-yellow-500/10'
  return 'text-red-400 bg-red-500/10'
}

function typeBadgeColor(type: string) {
  const map: Record<string, string> = {
    optician: 'bg-sky-500/10 text-sky-300',
    technician: 'bg-violet-500/10 text-violet-300',
    receptionist: 'bg-rose-500/10 text-rose-300',
    manager: 'bg-amber-500/10 text-amber-300',
  }
  return map[type] ?? 'bg-white/10 text-white/50'
}

export default function TeamSessionsClient({
  sessions,
  members,
}: {
  sessions: Session[]
  members: { id: string; name: string }[]
}) {
  const [filterUser, setFilterUser] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const filtered = sessions.filter(s => {
    if (filterUser !== 'all' && s.user_id !== filterUser) return false
    if (filterType !== 'all' && s.associateType !== filterType) return false
    return true
  })

  const types = Array.from(new Set(sessions.map(s => s.associateType))).sort()

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white/80 outline-none focus:border-[#2dd4bf]/60"
        >
          <option value="all">All Associates</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white/80 outline-none focus:border-[#2dd4bf]/60"
        >
          <option value="all">All Scenario Types</option>
          {types.map(t => (
            <option key={t} value={t}>{ASSOCIATE_TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-white/40">
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111827] px-6 py-12 text-center">
          <p className="text-sm text-white/50">No sessions match the selected filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(session => (
            <Link
              key={session.id}
              href={`/dashboard/session/${session.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111827] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{session.userName || session.userEmail}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColor(session.associateType)}`}>
                    {ASSOCIATE_TYPE_LABELS[session.associateType] ?? session.associateType}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/40">{session.scenarioTitle}</p>
                <p className="mt-0.5 text-xs text-white/30">
                  {new Date(session.completed_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {session.score !== null ? (
                <span className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${scoreColor(session.score)}`}>
                  {Math.round(session.score)}
                  <span className="ml-0.5 text-xs font-normal opacity-60">/100</span>
                </span>
              ) : (
                <span className="shrink-0 text-xs text-white/30">—</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
