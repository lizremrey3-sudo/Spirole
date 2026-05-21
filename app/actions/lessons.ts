'use server'

import { redirect } from 'next/navigation'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createSession } from './sessions'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type QuizQuestion = {
  question: string
  correct_answer: string
  distractors: string[]
}

export async function generateQuizQuestions(
  lessonTitle: string,
  contentMdx: string,
): Promise<QuizQuestion[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an instructional designer. Based on the lesson below, write exactly 3 multiple-choice quiz questions that test key concepts.

Lesson title: "${lessonTitle}"

Lesson content:
${contentMdx}

Return a JSON array with exactly this structure (no markdown, no extra text):
[
  {
    "question": "...",
    "correct_answer": "...",
    "distractors": ["wrong answer 1", "wrong answer 2", "wrong answer 3"]
  }
]`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as QuizQuestion[]
  } catch {
    // fall through to default
  }
  return []
}

export async function submitQuiz(
  lessonId: string,
  score: number,
  total: number,
): Promise<{ passed: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const passed = score / total >= 2 / 3

  await supabase
    .from('lesson_completions')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        quiz_score: score,
        quiz_passed: passed,
        scenario_unlocked: passed,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )

  return { passed }
}

export async function startSessionFromLesson(scenarioId: string): Promise<void> {
  const result = await createSession(scenarioId)
  if ('error' in result) {
    throw new Error(result.error)
  }
  redirect(`/dashboard/session/${result.sessionId}`)
}
