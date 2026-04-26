'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default function DashboardNav({
  email,
  dashboardHref = '/dashboard',
}: {
  email: string
  dashboardHref?: string
}) {
  const pathname = usePathname()

  const NAV = [
    { href: dashboardHref, label: 'Dashboard' },
    { href: '/dashboard/associate', label: 'My Sessions' },
    { href: '/dashboard/think', label: 'Think It Through' },
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <header className="border-b border-white/10 bg-[#111827]">
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-sm font-semibold tracking-tight text-white">Spirole</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-white/[0.06] px-6">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(href)
                ? 'border-[#2dd4bf] text-[#2dd4bf]'
                : 'border-transparent text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
