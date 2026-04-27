'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { inviteUser } from '@/app/actions/invite'
import { deactivateUser, reactivateUser, sendPasswordReset } from '@/app/actions/team'

type Member = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean
  practices: { name: string } | null
}

type Practice = { id: string; name: string }

const SCENARIO_OPTIONS = [
  { label: 'Optician Scenario',                  associate_type: 'optician',     session_type: undefined },
  { label: 'Technician Scenario',                associate_type: 'technician',   session_type: undefined },
  { label: 'Receptionist Scenario',              associate_type: 'receptionist', session_type: undefined },
  { label: 'Manager Scenario',                   associate_type: 'manager',      session_type: undefined },
  { label: 'Associate-to-Associate Interaction', associate_type: 'optician',     session_type: 'interaction' },
]

const ROLE_LABELS: Record<string, string> = {
  rep:     'Associate',
  manager: 'Manager',
  admin:   'Admin',
}

export default function TeamPanel({
  initialMembers,
  practices,
  currentUserId,
}: {
  initialMembers: Member[]
  practices: Practice[]
  currentUserId: string
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [showInvite, setShowInvite] = useState(false)
  const [showScenarioMenu, setShowScenarioMenu] = useState(false)
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const setRowMsg = (id: string, msg: string) =>
    setRowMessages(prev => ({ ...prev, [id]: msg }))

  const handleDeactivate = (userId: string) => {
    startTransition(async () => {
      const result = await deactivateUser(userId)
      if (!result.error) {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, is_active: false } : m))
        setRowMsg(userId, 'Deactivated.')
      } else {
        setRowMsg(userId, result.error)
      }
    })
  }

  const handleReactivate = (userId: string) => {
    startTransition(async () => {
      const result = await reactivateUser(userId)
      if (!result.error) {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, is_active: true } : m))
        setRowMsg(userId, 'Reactivated.')
      } else {
        setRowMsg(userId, result.error)
      }
    })
  }

  const handleResetPassword = (userId: string, email: string) => {
    startTransition(async () => {
      const result = await sendPasswordReset(email)
      setRowMsg(userId, result.error ?? 'Reset email sent.')
    })
  }

  const inputCls =
    'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80"
        >
          + Invite Team Member
        </button>

        <div className="relative">
          <button
            onClick={() => setShowScenarioMenu(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Create Scenario
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showScenarioMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowScenarioMenu(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-white/10 bg-[#111827] py-1 shadow-xl">
                {SCENARIO_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      const params = new URLSearchParams({ associate_type: opt.associate_type })
                      if (opt.session_type) params.set('session_type', opt.session_type)
                      router.push(`/dashboard/scenarios/new?${params.toString()}`)
                      setShowScenarioMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team members list */}
      <div className="rounded-xl border border-white/10 bg-[#111827] overflow-hidden">
        <div className="border-b border-white/10 px-5 py-3">
          <h2 className="text-sm font-semibold text-[#2dd4bf]">Team Members</h2>
        </div>
        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-white/40">No team members yet. Invite someone above.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {members.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${!m.is_active ? 'opacity-50' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {m.full_name || m.email || '—'}
                    {!m.is_active && (
                      <span className="ml-2 text-xs font-normal text-white/40">Deactivated</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/50">{m.email}</p>
                </div>

                <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
                  <span className="text-xs text-white/50">{ROLE_LABELS[m.role] ?? m.role}</span>
                  {m.practices?.name && (
                    <span className="text-xs text-white/30">{m.practices.name}</span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {rowMessages[m.id] ? (
                    <span className="max-w-[160px] truncate text-xs text-[#2dd4bf]">{rowMessages[m.id]}</span>
                  ) : (
                    <>
                      {m.id !== currentUserId && m.email && (
                        <button
                          onClick={() => handleResetPassword(m.id, m.email!)}
                          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
                        >
                          Reset Password
                        </button>
                      )}
                      {m.id !== currentUserId && (
                        m.is_active ? (
                          <button
                            onClick={() => handleDeactivate(m.id)}
                            className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(m.id)}
                            className="rounded-md border border-[#2dd4bf]/20 px-3 py-1.5 text-xs text-[#2dd4bf]/70 transition-colors hover:bg-[#2dd4bf]/10 hover:text-[#2dd4bf]"
                          >
                            Reactivate
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          practices={practices}
          inputCls={inputCls}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}

function InviteModal({
  practices,
  inputCls,
  onClose,
}: {
  practices: Practice[]
  inputCls: string
  onClose: () => void
}) {
  const [state, action, isPending] = useActionState(inviteUser, null)
  const [practiceValue, setPracticeValue] = useState(
    practices.length > 0 ? practices[0].name : '__new__'
  )
  const [newPracticeName, setNewPracticeName] = useState('')
  const isCreatingNew = practiceValue === '__new__'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-lg text-white/40 hover:text-white/70">✕</button>
        </div>

        {state?.error && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
        )}
        {state?.message ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="text-sm text-[#2dd4bf]">{state.message}</p>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            {/* Hidden field carries the resolved practice name */}
            <input
              type="hidden"
              name="practice_name"
              value={isCreatingNew ? newPracticeName.trim() : practiceValue}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-white/50">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="colleague@example.com"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-white/50">Role</label>
              <select name="role" defaultValue="rep" className={`${inputCls} bg-[#0a0e1a]`}>
                <option value="rep">Associate</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-white/50">Practice</label>
              <select
                value={practiceValue}
                onChange={e => setPracticeValue(e.target.value)}
                className={`${inputCls} bg-[#0a0e1a]`}
              >
                {practices.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="__new__">+ Create new practice…</option>
              </select>
              {isCreatingNew && (
                <input
                  placeholder="Practice name"
                  value={newPracticeName}
                  onChange={e => setNewPracticeName(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              )}
            </div>

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
              >
                {isPending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
