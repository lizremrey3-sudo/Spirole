export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import QuizClient from './quiz-client'
import { generateQuizQuestions } from '@/app/actions/lessons'
import type { QuizQuestion } from '@/app/actions/lessons'

type LanguageFramework = {
  short_version?: string
  long_version?: string
  refusal_script?: string
  do_not_say?: string[]
}

function estimateReadTime(mdx: string): number {
  const wordCount = mdx.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

function FrameworkCard({ framework }: { framework: LanguageFramework }) {
  const sections: { label: string; content: string | string[] | undefined }[] = [
    { label: 'Quick Version', content: framework.short_version },
    { label: 'Full Version', content: framework.long_version },
    { label: 'When They Push Back', content: framework.refusal_script },
    { label: 'Avoid Saying', content: framework.do_not_say },
  ]

  return (
    <div className="my-8 rounded-xl border border-[#2dd4bf]/20 bg-[#111827]">
      <div className="border-b border-white/10 px-6 py-4">
        <h3 className="text-sm font-semibold text-[#2dd4bf]">Language Framework</h3>
        <p className="mt-0.5 text-xs text-white/40">Scripts to guide real conversations</p>
      </div>
      <div className="divide-y divide-white/5">
        {sections.map(({ label, content }) => {
          if (!content || (Array.isArray(content) && content.length === 0)) return null
          return (
            <div key={label} className="px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
              {Array.isArray(content) ? (
                <ul className="space-y-1">
                  {content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="mt-0.5 text-red-400">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-white/80 italic">"{content}"</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
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

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, description, content_mdx, language_framework, role_tags, industry_tags, scenario_id, order_index')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (!lesson) redirect('/dashboard')

  const [rawQuestionsResult, completionRow] = await Promise.all([
    supabase
      .from('lesson_quiz_questions')
      .select('question, correct_answer, distractors, order_index')
      .eq('lesson_id', lesson.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('lesson_completions')
      .select('quiz_passed')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle(),
  ])

  let questions: QuizQuestion[] = (rawQuestionsResult.data ?? []).map(q => ({
    question: q.question as string,
    correct_answer: q.correct_answer as string,
    distractors: (q.distractors as string[]) ?? [],
  }))

  if (questions.length === 0) {
    try {
      questions = await generateQuizQuestions(lesson.title as string, lesson.content_mdx as string)
    } catch {
      questions = []
    }
  }

  const initialPassed = (completionRow.data?.quiz_passed as boolean | null) ?? false
  const readTime = estimateReadTime(lesson.content_mdx as string)
  const framework = lesson.language_framework as LanguageFramework | null
  const dashboardHref = ['manager', 'admin'].includes(profile.role as string)
    ? '/dashboard/manager'
    : '/dashboard'

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} dashboardHref={dashboardHref} role={profile.role ?? undefined} />

      <main className="mx-auto w-full max-w-3xl flex-1 min-w-0 px-6 py-10">

        {/* Back */}
        <a
          href="/learn"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/60"
        >
          ← Lessons
        </a>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap gap-2">
            {(lesson.industry_tags as string[]).map(tag => (
              <span key={tag} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/40">
                {tag}
              </span>
            ))}
            {(lesson.role_tags as string[]).map(tag => (
              <span key={tag} className="rounded-full bg-[#2dd4bf]/10 px-2.5 py-0.5 text-xs text-[#2dd4bf]">
                {tag}
              </span>
            ))}
            {initialPassed && (
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-400">
                ✓ Completed
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-white">{lesson.title as string}</h1>
          {lesson.description && (
            <p className="mt-2 text-sm text-white/50">{lesson.description as string}</p>
          )}
          <p className="mt-2 text-xs text-white/30">{readTime} min read</p>
        </div>

        {/* MDX content */}
        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-white/70 prose-p:leading-relaxed
          prose-li:text-white/70
          prose-strong:text-white
          prose-table:text-sm
          prose-th:text-white/60 prose-th:font-semibold prose-th:border-white/10
          prose-td:text-white/60 prose-td:border-white/10
          prose-hr:border-white/10
          prose-code:text-[#2dd4bf] prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        ">
          <MDXRemote source={lesson.content_mdx as string} />
        </div>

        {/* Language framework card */}
        {framework && Object.keys(framework).length > 0 && (
          <FrameworkCard framework={framework} />
        )}

        {/* Quiz */}
        <div className="mt-10">
          <QuizClient
            lessonId={lesson.id as string}
            questions={questions}
            scenarioId={(lesson.scenario_id as string | null) ?? null}
            initialPassed={initialPassed}
          />
        </div>

      </main>
    </div>
  )
}
