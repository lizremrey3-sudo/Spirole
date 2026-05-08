'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { INDUSTRIES, getAssociateTypesForIndustry } from '@/lib/industry-types'

const inputCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'
const selectCls = `${inputCls} bg-[#0a0e1a]`

export default function SignUpPage() {
  const [state, action, isPending] = useActionState(signUp, null)
  const [industry, setIndustry] = useState('optical')
  const associateTypes = getAssociateTypesForIndustry(industry)

  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-white">Create an account</h1>

      {state?.message && (
        <p className="mb-4 rounded-md bg-[#2dd4bf]/10 px-4 py-3 text-sm text-[#2dd4bf]">{state.message}</p>
      )}
      {state?.error && (
        <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="companyName" className="text-sm font-medium text-white/70">Company name</label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="industry" className="text-sm font-medium text-white/70">Industry</label>
          <select
            id="industry"
            name="industry"
            required
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className={selectCls}
          >
            {INDUSTRIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="primary_associate_type" className="text-sm font-medium text-white/70">Primary associate type</label>
          <select
            id="primary_associate_type"
            name="primary_associate_type"
            required
            className={selectCls}
          >
            {associateTypes.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

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
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-white/70">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
        >
          {isPending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-[#2dd4bf] hover:underline">Sign in</Link>
      </p>
    </>
  )
}
