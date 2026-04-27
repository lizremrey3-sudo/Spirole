import { signOut } from '@/app/actions/auth'

export default function DeactivatedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-white">Account Deactivated</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/60">
          Your account has been deactivated. Please contact your manager or practice admin to regain access.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
