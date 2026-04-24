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
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Spirole</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-zinc-100 px-6">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(href)
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
