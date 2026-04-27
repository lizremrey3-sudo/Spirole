'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPassword, null)

  const inputCls =
    'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Forgot password</h1>
      <p className="mb-8 text-sm text-white/50">Enter your email and we'll send you a reset link.</p>

      {state?.error && (
        <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      {state?.message ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-md bg-[#2dd4bf]/10 px-4 py-3 text-sm text-[#2dd4bf]">{state.message}</p>
          <Link href="/sign-in" className="text-center text-sm text-white/50 hover:text-white/70">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-white/70">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </button>
          <Link href="/sign-in" className="text-center text-sm text-white/50 hover:text-white/70">
            Back to sign in
          </Link>
        </form>
      )}
    </>
  )
}
