export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#0a0e1a] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-8">
        {children}
      </div>
    </div>
  )
}
