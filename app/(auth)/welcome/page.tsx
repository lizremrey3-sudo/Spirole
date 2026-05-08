'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WelcomePage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tosChecked, setTosChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const inputCls =
    'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setPending(false)
      setError(updateError.message)
      return
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      await supabase
        .from('users')
        .update({ tos_accepted_at: new Date().toISOString() })
        .eq('id', authUser.id)
    }

    // Sign out to clear the implicit-flow localStorage session so the user
    // signs in fresh with their new password and gets proper server-side cookies.
    await supabase.auth.signOut()
    window.location.assign('/sign-in?message=password_set')
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Welcome to Spirole!</h1>
      <p className="mb-8 text-sm text-white/50">Create your password to get started.</p>

      {error && (
        <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-white/70">New Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm" className="text-sm font-medium text-white/70">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={inputCls}
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={tosChecked}
            onChange={e => setTosChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#2dd4bf]"
          />
          <span className="text-sm text-white/60 leading-snug">
            I agree to the{' '}
            <a href="/tos" target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:underline">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        <button
          type="submit"
          disabled={pending || !tosChecked}
          className="mt-2 rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Get started'}
        </button>
      </form>
    </>
  )
}
