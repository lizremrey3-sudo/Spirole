'use client'

import { useActionState } from 'react'
import { applyPromoCode } from '@/app/actions/subscriptions'

export default function PromoCodeForm() {
  const [state, action, isPending] = useActionState(applyPromoCode, null)

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-[#2dd4bf]/10 px-3 py-2 text-sm text-[#2dd4bf]">{state.message}</p>
      )}
      <div className="flex gap-2">
        <input
          name="code"
          type="text"
          placeholder="PROMO-CODE"
          required
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase tracking-wider text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </form>
  )
}
