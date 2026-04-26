'use client'

import { useActionState } from 'react'
import { inviteUser } from '@/app/actions/invite'

export default function InviteForm() {
  const [state, action, isPending] = useActionState(inviteUser, null)

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Invite a team member</h2>
      <p className="mb-4 text-sm text-white/50">
        They'll receive an email and join your account automatically.
      </p>

      {state?.error && (
        <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.message && (
        <p className="mb-3 rounded-md bg-[#2dd4bf]/10 px-3 py-2 text-sm text-[#2dd4bf]">{state.message}</p>
      )}

      <form action={action} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="colleague@example.com"
            required
            className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
          />
          <select
            name="role"
            defaultValue="rep"
            className="rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
          >
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
          >
            {isPending ? 'Sending…' : 'Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}
