'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default function DashboardNav({
  email,
  dashboardHref = '/dashboard',
  role,
}: {
  email: string
  dashboardHref?: string
  role?: string
}) {
  const pathname = usePathname()

  const NAV = [
    { href: dashboardHref, label: 'Dashboard' },
    { href: '/dashboard/associate', label: 'Sessions' },
    { href: '/dashboard/think', label: 'Reflect' },
    ...(role === 'admin' ? [{ href: '/dashboard/tenant', label: 'Admin' }] : []),
  ]

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="sticky top-0 flex h-screen w-[210px] shrink-0 flex-col border-r border-white/10 bg-[#111827]">
      <div className="px-5 py-5">
        <span className="text-sm font-semibold tracking-tight text-white">Spirole</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-[#2dd4bf]/10 text-[#2dd4bf]'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="mb-2 truncate text-xs text-white/40">{email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
