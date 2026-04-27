'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'

const LINK_EXPIRED_MSG = 'This link has expired. Please request a new invite.'

export default function SignInPage() {
  const router = useRouter()
  const [state, action, isPending] = useActionState(signIn, null)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.message === 'ok') {
      router.push('/dashboard')
      return
    }
  }, [state, router])

  useEffect(() => {
    // Handle ?error= query param (PKCE flow errors redirected from /auth/callback)
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'link_expired') {
      setUrlError(LINK_EXPIRED_MSG)
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Handle #error= hash fragment (implicit flow errors — never reach the server)
    const hash = window.location.hash.slice(1)
    if (hash) {
      const hashParams = new URLSearchParams(hash)
      if (hashParams.get('error')) {
        setUrlError(LINK_EXPIRED_MSG)
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const displayError = state?.message === 'ok' ? null : (state?.error ?? urlError)

  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-white">Sign in</h1>

      {displayError && (
        <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{displayError}</p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-white/70">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-white/70">Password</label>
            <Link href="/forgot-password" className="text-xs text-white/40 hover:text-white/60">
              Forgot your password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        No account yet?{' '}
        <Link href="/sign-up" className="font-medium text-[#2dd4bf] hover:underline">Sign up</Link>
      </p>
    </>
  )
}
