export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'

type Lesson = {
  id: string
  title: string
  slug: string
  description: string | null
  content_mdx: string
  role_tags: string[]
  industry_tags: string[]
  order_index: number
}

type Completion = {
  lesson_id: string
  quiz_passed: boolean
}

function estimateReadTime(mdx: string): number {
  return Math.max(1, Math.ceil(mdx.trim().split(/\s+/).length / 200))
}

export default async function LearnPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/sign-in')
  if ((profile as { is_active?: boolean }).is_active === false) redirect('/deactivated')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('industry')
    .eq('id', profile.tenant_id as string)
    .single()

  const tenantIndustry = (tenant?.industry as string | null) ?? 'optical'
  const role = (profile.role as string) ?? 'associate'
  const dashboardHref = ['manager', 'admin'].includes(role) ? '/dashboard/manager' : '/dashboard'

  const [lessonsResult, completionsResult] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, slug, description, content_mdx, role_tags, industry_tags, order_index')
      .eq('is_published', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('lesson_completions')
      .select('lesson_id, quiz_passed')
      .eq('user_id', user.id),
  ])

  const allLessons = (lessonsResult.data ?? []) as Lesson[]
  const completions = (completionsResult.data ?? []) as Completion[]
  const completedIds = new Set(completions.filter(c => c.quiz_passed).map(c => c.lesson_id))

  // Filter: show lessons tagged for 'all' or matching tenant industry
  // Also filter by role: manager-tagged lessons only shown to managers/admins
  const lessons = allLessons.filter(l => {
    const industryMatch =
      l.industry_tags.includes('all') || l.industry_tags.includes(tenantIndustry)
    const roleMatch =
      l.role_tags.includes('manager')
        ? ['manager', 'admin'].includes(role)
        : true
    return industryMatch && roleMatch
  })

  const completedCount = lessons.filter(l => completedIds.has(l.id)).length

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref={dashboardHref} role={role} />

      <main className="mx-auto w-full max-w-4xl flex-1 min-w-0 px-6 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Lessons</h1>
          <p className="mt-1 text-sm text-white/50">
            {completedCount} of {lessons.length} completed
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111827] p-10 text-center">
            <p className="text-sm text-white/40">No lessons available for your practice yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {lessons.map(lesson => {
              const done = completedIds.has(lesson.id)
              const readTime = estimateReadTime(lesson.content_mdx)
              return (
                <div
                  key={lesson.id}
                  className="flex flex-col rounded-xl border border-white/10 bg-[#111827] p-5 transition-colors hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.role_tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#2dd4bf]/10 px-2 py-0.5 text-xs text-[#2dd4bf]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {done && (
                      <span className="shrink-0 text-green-400 text-sm">✓</span>
                    )}
                  </div>

                  <h2 className="mb-1 text-sm font-semibold text-white leading-snug">
                    {lesson.title}
                  </h2>
                  {lesson.description && (
                    <p className="mb-3 text-xs text-white/50 leading-relaxed line-clamp-2">
                      {lesson.description}
                    </p>
                  )}
                  <p className="mb-4 text-xs text-white/30">{readTime} min read</p>

                  <div className="mt-auto">
                    <Link
                      href={`/learn/${lesson.slug}`}
                      className={[
                        'block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors',
                        done
                          ? 'border border-white/10 text-white/50 hover:bg-white/5'
                          : 'bg-[#2dd4bf] text-[#0a0e1a] hover:opacity-90',
                      ].join(' ')}
                    >
                      {done ? 'Review Lesson' : 'Start Lesson'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
