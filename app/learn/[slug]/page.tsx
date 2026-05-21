export const dynamic = 'force-dynamic'

import type React from 'react'
import { redirect } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

const mdComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-10 mb-4 flex items-center gap-3 text-lg font-semibold text-white first:mt-0">
      <span className="inline-block h-5 w-0.5 shrink-0 rounded-full bg-[#2dd4bf]" />
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-7 mb-3 text-base font-semibold text-white/90">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-4 text-[15px] leading-[1.8] text-white/65">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-4 space-y-2.5 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-4 space-y-2.5 pl-5 list-decimal marker:text-[#2dd4bf] marker:font-semibold">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2.5 text-[15px] leading-[1.8] text-white/65 [&>ol]:my-0 [&>ul]:my-0 list-none">
      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2dd4bf]/60" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-white/75">{children}</em>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-5 rounded-r-lg border-l-2 border-white/20 bg-white/[0.03] py-3 pl-4 pr-4 text-[15px] leading-[1.8] text-white/50 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-6 overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-[#2dd4bf]/10">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-[#2dd4bf]/20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#2dd4bf]">
      {children}
    </th>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="bg-[#111827]">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]">
      {children}
    </tr>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-3 text-white/55 align-top">{children}</td>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px] text-[#2dd4bf]">{children}</code>
  ),
  hr: () => <hr className="my-8 border-white/10" />,
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

        {/* Lesson content */}
        <div className="rounded-xl border border-white/10 bg-[#111827]/60 px-8 py-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {lesson.content_mdx as string}
          </ReactMarkdown>
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
