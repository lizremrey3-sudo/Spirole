'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { INDUSTRIES, getAssociateTypesForIndustry } from '@/lib/industry-types'

const inputCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40'

type SelectOption = { value: string; label: string }

function CustomSelect({
  id,
  name,
  options,
  value,
  onChange,
}: {
  id: string
  name: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const i = options.findIndex(o => o.value === value)
      if (i < options.length - 1) onChange(options[i + 1].value)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const i = options.findIndex(o => o.value === value)
      if (i > 0) onChange(options[i - 1].value)
    }
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={onKeyDown}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-md border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
      >
        <span>{selected?.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[#1f2937] py-1 shadow-2xl"
        >
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={[
                  'cursor-pointer px-3 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-[#2dd4bf] font-medium text-[#0a0e1a]'
                    : 'text-white hover:bg-white/10',
                ].join(' ')}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function SignUpPage() {
  const [state, action, isPending] = useActionState(signUp, null)
  const [industry, setIndustry] = useState('optical')
  const associateTypes = getAssociateTypesForIndustry(industry)
  const [associateType, setAssociateType] = useState<string>(associateTypes[0]?.value ?? '')

  function handleIndustryChange(val: string) {
    setIndustry(val)
    const types = getAssociateTypesForIndustry(val)
    setAssociateType(types[0]?.value ?? '')
  }

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
          <CustomSelect
            id="industry"
            name="industry"
            options={INDUSTRIES.map(({ value, label }) => ({ value, label }))}
            value={industry}
            onChange={handleIndustryChange}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="primary_associate_type" className="text-sm font-medium text-white/70">Primary associate type</label>
          <CustomSelect
            id="primary_associate_type"
            name="primary_associate_type"
            options={associateTypes.map(({ value, label }) => ({ value, label }))}
            value={associateType}
            onChange={setAssociateType}
          />
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
