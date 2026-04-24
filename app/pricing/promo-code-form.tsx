'use client'

import { useActionState } from 'react'
import { applyPromoCode } from '@/app/actions/subscriptions'

export default function PromoCodeForm() {
  const [state, action, isPending] = useActionState(applyPromoCode, null)

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
      )}
      <div className="flex gap-2">
        <input
          name="code"
          type="text"
          placeholder="PROMO-CODE"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </form>
  )
}
