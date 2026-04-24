'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type AssessmentContent = {
  trend_analysis: string
  opportunities: string
  team_communication_style: string
  actionable_tips: [string, string]
}

export type GenerateAssessmentResult =
  | { content: AssessmentContent; generated_at: string }
  | { error: string }

export async function generateAssessment(
  practiceId: string | null,
  tenantId: string,
): Promise<GenerateAssessmentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  let userIds: string[]
  if (practiceId) {
    const { data: practiceUsers } = await supabase
      .from('users')
      .select('id')
      .eq('practice_id', practiceId)
      .eq('tenant_id', tenantId)
    userIds = (practiceUsers ?? []).map(u => u.id as string)
  } else {
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
    userIds = (allUsers ?? []).map(u => u.id as string)
  }

  if (userIds.length === 0) return { error: 'No team members found.' }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('score, feedback, completed_at, scenarios(associate_type)')
    .in('user_id', userIds)
    .eq('status', 'completed')
    .gte('completed_at', fourteenDaysAgo)
    .not('score', 'is', null)
    .order('completed_at', { ascending: false })

  if (!sessions || sessions.length < 3) {
    return { error: 'Not enough data — need at least 3 completed sessions in the past 14 days.' }
  }

  const sessionLines = sessions.map(s => {
    const date = new Date(s.completed_at as string).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })
    const score = Number(s.score).toFixed(0)
    const scenario = Array.isArray(s.scenarios) ? s.scenarios[0] : s.scenarios
    const type = (scenario as { associate_type?: string } | null)?.associate_type ?? 'unknown'
    let overallFeedback = ''
    try {
      const parsed = JSON.parse(s.feedback as string)
      overallFeedback = parsed.overall_feedback ?? ''
    } catch { /* no feedback */ }
    return `- ${date}: ${type} scenario, score ${score}/100${overallFeedback ? `. ${overallFeedback}` : ''}`
  }).join('\n')

  const prompt = `You are an expert in optical practice team performance and communication coaching.

The following are AI roleplay training session results from the past 14 days:

${sessionLines}

Generate a substantive team assessment. No one-liners — write in the coaching voice of a seasoned practice consultant.

Return ONLY valid JSON with EXACTLY these keys:
{
  "trend_analysis": "<2-3 sentences analyzing score trends and overall trajectory>",
  "opportunities": "<2-3 sentences identifying the most significant opportunities for improvement>",
  "team_communication_style": "<2-3 sentences describing this team's communication patterns and tendencies across session types>",
  "actionable_tips": [
    "<Tip 1 — 2-3 sentences, specific and practical, for use in team meetings, trainings, or 1-on-1 coaching conversations>",
    "<Tip 2 — 2-3 sentences, specific and practical, for use in team meetings, trainings, or 1-on-1 coaching conversations>"
  ]
}`

  let content: AssessmentContent
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    content = JSON.parse(match[0]) as AssessmentContent
    if (!content.trend_analysis || !content.opportunities || !content.team_communication_style || !Array.isArray(content.actionable_tips)) {
      throw new Error('Incomplete assessment fields')
    }
  } catch {
    return { error: 'Failed to generate assessment. Please try again.' }
  }

  const generated_at = new Date().toISOString()

  await supabase.from('assessments').insert({
    tenant_id: tenantId,
    practice_id: practiceId,
    content,
    generated_at,
  })

  return { content, generated_at }
}
