import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type RubricDimension = {
  name: string
  weight: number
  description: string
}

type RubricJson = {
  dimensions?: RubricDimension[]
}

type PersonaJson = Record<string, unknown>

type CoachingSummary = {
  main_issues: string[]
  what_tried: string[]
  next_steps: string[]
  overall_themes: string
}

const LEADERSHIP_RUBRIC: RubricDimension[] = [
  { name: 'questioning_quality',  weight: 20, description: 'Quality and depth of questions asked to draw out insight from the coachee' },
  { name: 'psychological_safety', weight: 20, description: 'Ability to create a safe environment for honest conversation and vulnerability' },
  { name: 'feedback_specificity', weight: 20, description: 'How specific, behavioral, and actionable the feedback provided was' },
  { name: 'active_listening',     weight: 20, description: 'Evidence of deep listening, reflection, and building on what was said' },
  { name: 'empowerment',          weight: 20, description: 'Degree to which the coach helped the coachee find their own solutions' },
]

function buildCoachingPrompt(transcript: string): string {
  return `This is a leadership coaching conversation. Summarize it concisely with these sections: Main Issues Discussed (bullet points), What Has Been Tried (bullet points), Possible Next Steps (bullet points), Overall Themes (2-3 sentences). Return as JSON with keys: main_issues, what_tried, next_steps, overall_themes.

TRANSCRIPT:
${transcript}

Return ONLY the JSON object with no additional text or markdown.`
}

function buildEvalPrompt(
  scenarioTitle: string,
  scenarioDescription: string | null,
  persona: PersonaJson,
  dimensions: RubricDimension[],
  transcript: string,
  sessionType: string,
): string {
  const personaName = typeof persona.name === 'string' ? persona.name : 'the character'
  const isLeadership = sessionType === 'leadership_coaching'
  const trainerLabel = isLeadership ? 'leadership development expert' : 'expert sales trainer'
  const practitionerLabel = isLeadership ? 'manager/coach' : 'sales rep'

  const dimensionList = dimensions
    .map((d, i) => `${i + 1}. ${d.name} (weight: ${d.weight}%)\n   ${d.description}`)
    .join('\n')
  const dimensionNames = dimensions.map(d => `"${d.name}"`).join(', ')

  return `You are an ${trainerLabel} evaluating a practice session.

SCENARIO: ${scenarioTitle}${scenarioDescription ? `\n${scenarioDescription}` : ''}

CHARACTER PLAYED BY AI: ${personaName}

RUBRIC DIMENSIONS:
${dimensionList}

TRANSCRIPT:
${transcript}

EVALUATION INSTRUCTIONS:
Score the ${practitionerLabel}'s performance on each of the following dimensions: ${dimensionNames}

Use these behavioral anchors for scoring:
- Score 0–3 (Poor): No attempt or critical gaps. Failed to demonstrate the behaviors expected for this dimension.
- Score 4–6 (Developing): Some effort but inconsistent execution. Key elements present but underdeveloped or applied incorrectly.
- Score 7–10 (Proficient): Strong, consistent execution with clear evidence from the conversation.

Return your evaluation as a valid JSON object with this exact structure:
{
  "scores": {
    "<dimension name>": {
      "score": <integer 0-10>,
      "rationale": "<specific feedback citing examples from the transcript>"
    }
  },
  "overall_feedback": "<2-3 sentence summary of overall performance>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}

IMPORTANT: The associate's responses were recorded via speech-to-text microphone and may lack punctuation, capitalization, or contain run-on sentences. Do not evaluate or penalize any of these — evaluate only the content, communication quality, empathy, product knowledge, and interpersonal skills. Treat all text as spoken word, not written text.

Return ONLY the JSON object with no additional text or markdown.`
}

type EvalScores = Record<string, { score: number; rationale: string }>

type EvalResult = {
  scores: EvalScores
  overall_feedback: string
  strengths: string[]
  improvements: string[]
  rubric_dimensions?: RubricDimension[]
}

function unweightedAvg(scores: EvalScores): number {
  const vals = Object.values(scores)
    .map(e => Number(e.score))
    .filter(n => isFinite(n))
  if (vals.length === 0) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10)
}

function calcOverallScore(scores: EvalScores, dimensions: RubricDimension[]): number {
  if (dimensions.length === 0) return unweightedAvg(scores)

  let totalWeight = 0
  let weightedSum = 0

  for (const dim of dimensions) {
    const entry    = scores[dim.name]
    const dimWeight = Number(dim.weight)
    const dimScore  = Number(entry?.score)

    if (isFinite(dimScore) && isFinite(dimWeight) && dimWeight > 0) {
      weightedSum += dimScore * dimWeight
      totalWeight += dimWeight
    }
  }

  if (totalWeight === 0) return unweightedAvg(scores)

  const result = (weightedSum / totalWeight) * 10
  return isFinite(result) ? Math.round(result * 100) / 100 : unweightedAvg(scores)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id, tenant_id, status, scenarios(title, description, persona, rubric, associate_type)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'in_progress') {
    return Response.json({ error: 'Session is already completed' }, { status: 400 })
  }

  const { data: messages } = await supabase
    .from('session_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  const allMessages = messages ?? []
  const userTurns = allMessages.filter(m => m.role === 'user').length

  if (userTurns < 6) {
    return Response.json(
      { error: 'session_too_short', message: `At least 6 exchanges required. You have ${userTurns} so far.` },
      { status: 422 }
    )
  }

  const scenarioRaw  = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios
  const associateType = (scenarioRaw?.associate_type as string | undefined) ?? 'optician'
  const sessionType  = associateType === 'manager' ? 'leadership_coaching' : 'sales_roleplay'
  const scenarioTitle = (scenarioRaw?.title as string | undefined) ?? 'Untitled Scenario'
  const scenarioDesc  = (scenarioRaw?.description as string | null | undefined) ?? null
  const persona       = (scenarioRaw?.persona ?? {}) as PersonaJson
  const rubric        = (scenarioRaw?.rubric ?? {}) as RubricJson
  const personaName   = typeof persona.name === 'string' ? persona.name : 'AI'

  // For leadership coaching use the hardcoded rubric unless the scenario has custom dimensions
  const scenarioDimensions = rubric.dimensions ?? []
  const effectiveDimensions: RubricDimension[] =
    sessionType === 'leadership_coaching' && scenarioDimensions.length === 0
      ? LEADERSHIP_RUBRIC
      : scenarioDimensions

  const practitionerLabel = sessionType === 'leadership_coaching' ? 'Manager' : 'Staff'
  const transcript = allMessages
    .map(m => `[${m.role === 'user' ? practitionerLabel : personaName}]: ${m.content}`)
    .join('\n\n')

  if (sessionType === 'leadership_coaching') {
    const coachingPrompt = buildCoachingPrompt(transcript)
    const summaryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: coachingPrompt }],
    })

    const rawSummaryText = summaryResponse.content[0].type === 'text' ? summaryResponse.content[0].text : ''

    let summary: CoachingSummary
    try {
      const jsonMatch = rawSummaryText.match(/\{[\s\S]*\}/)
      summary = JSON.parse(jsonMatch ? jsonMatch[0] : rawSummaryText) as CoachingSummary
    } catch {
      return Response.json({ error: 'Failed to parse coaching summary' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        score: null,
        feedback: JSON.stringify(summary),
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

    return Response.json({ summary, overallScore: null })
  }

  const evalPrompt = buildEvalPrompt(
    scenarioTitle, scenarioDesc, persona, effectiveDimensions, transcript, sessionType,
  )

  const evalResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: evalPrompt }],
  })

  const rawText = evalResponse.content[0].type === 'text' ? evalResponse.content[0].text : ''

  let evaluation: EvalResult
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as EvalResult
  } catch {
    return Response.json({ error: 'Failed to parse evaluation response' }, { status: 500 })
  }

  const overallScore = calcOverallScore(evaluation.scores, effectiveDimensions)

  // Persist rubric_dimensions so ResultsView can render them even when scenario rubric is empty
  const feedbackWithDimensions: EvalResult = { ...evaluation, rubric_dimensions: effectiveDimensions }

  const { error: updateError } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      score: overallScore,
      feedback: JSON.stringify(feedbackWithDimensions),
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ evaluation: feedbackWithDimensions, overallScore })
}
