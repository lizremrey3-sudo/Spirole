'use client'

import { useActionState } from 'react'
import { inviteUser } from '@/app/actions/invite'

export default function InviteForm() {
  const [state, action, isPending] = useActionState(inviteUser, null)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900">Invite a team member</h2>
      <p className="mb-4 text-sm text-zinc-500">
        They'll receive an email and join your account automatically.
      </p>

      {state?.error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.message && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
      )}

      <form action={action} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="colleague@example.com"
            required
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
          <select
            name="role"
            defaultValue="rep"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          >
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? 'Sending…' : 'Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}
