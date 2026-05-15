'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { applyPromoCode } from '@/app/actions/subscriptions'

export default function PromoCodeForm() {
  const router = useRouter()
  const [state, action, isPending] = useActionState(applyPromoCode, null)

  if (state?.activated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="mx-4 max-w-sm w-full rounded-2xl border border-white/10 bg-[#0d1117] p-8 text-center shadow-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#2dd4bf]">
            You&apos;re in
          </p>
          <p className="mb-8 text-base leading-relaxed text-white">
            You and your invitees are active for free until June 15, 2026.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-md bg-[#2dd4bf] px-4 py-3 text-sm font-semibold text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

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
