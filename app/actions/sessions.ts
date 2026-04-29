'use server'

import Anthropic from '@anthropic-ai/sdk'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STAFF_ROLE_LABELS: Record<string, string> = {
  optician:     'optician',
  technician:   'ophthalmic technician',
  receptionist: 'receptionist',
  manager:      'practice manager',
}

type PersonaJson = Record<string, unknown>

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

async function generateOpeningMessage(
  persona: PersonaJson,
  associateType: string,
  title: string,
  description: string | null,
  sessionType: string,
): Promise<string> {
  const name       = str(persona.name)
  const tone       = str(persona.tone) ?? str(persona.personality)
  const complaint  = str(persona.chief_complaint) ?? str(persona.challenge as unknown)
  const background = str(persona.background)
  const lines: string[] = []

  if (sessionType === 'leadership_coaching') {
    lines.push(`You are an experienced leadership coach opening a 1:1 coaching session with a manager.`)
    if (tone)       lines.push(`The manager's general situation or tone: ${tone}.`)
    if (background) lines.push(`Background context: ${background}.`)
    if (complaint)  lines.push(`Focus area or challenge: ${complaint}.`)
    lines.push(`Scenario: ${title}${description ? ` — ${description}` : ''}.`)
    lines.push(
      '',
      'Write a single, warm, open-ended coaching opening line (1–2 sentences) that invites the manager to share what\'s on their mind.',
      'Examples: "What\'s on your mind today?" or "What would make this conversation most useful for you?"',
      'Return only the message text, no quotes or labels.',
    )
  } else {
    const staffRole = STAFF_ROLE_LABELS[associateType] ?? 'staff member'
    const charName  = name ?? 'a patient'
    lines.push(`You are ${charName}, a patient at an optometric practice, about to speak with the ${staffRole}.`)
    if (tone)       lines.push(`Your demeanor: ${tone}.`)
    if (background) lines.push(`Your background: ${background}.`)
    if (complaint)  lines.push(`Your reason for visiting: ${complaint}.`)
    lines.push(`Scenario: ${title}${description ? ` — ${description}` : ''}.`)
    lines.push(
      '',
      `Write a single natural opening line (1–2 sentences) that you would say when the ${staffRole} first greets you.`,
      'Be specific to this scenario. Return only the message text, no quotes or labels.',
    )
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{ role: 'user', content: lines.join('\n') }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  if (text) return text
  return sessionType === 'leadership_coaching'
    ? "What's on your mind today?"
    : `Hi, I have an appointment today${name ? ` — I'm ${name}` : ''}.`
}

type CreateSessionResult = { sessionId: string; resumed: boolean } | { error: string }

export async function createSession(scenarioId: string): Promise<CreateSessionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'User profile not found.' }

  // Abandon any in_progress sessions for this scenario older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('sessions')
    .update({ status: 'abandoned' })
    .eq('user_id', user.id)
    .eq('scenario_id', scenarioId)
    .eq('status', 'in_progress')
    .lt('started_at', twentyFourHoursAgo)

  // Resume only if a recent in_progress session exists — never resume completed or abandoned
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('scenario_id', scenarioId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing?.status === 'in_progress') return { sessionId: existing.id, resumed: true }

  // Fetch scenario first so we can stamp session_type on the session record
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('title, description, persona, associate_type')
    .eq('id', scenarioId)
    .single()

  const persona       = (scenario?.persona ?? {}) as PersonaJson
  const associateType = (scenario?.associate_type as string | undefined) ?? 'optician'
  const sessionType   = associateType === 'manager' ? 'leadership_coaching' : 'sales_roleplay'
  const title         = (scenario?.title as string | undefined) ?? 'Training Scenario'
  const description   = (scenario?.description as string | null | undefined) ?? null

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      tenant_id: profile.tenant_id,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (sessionError || !session) return { error: sessionError?.message ?? 'Failed to create session.' }

  let openingMessage: string
  try {
    openingMessage = await generateOpeningMessage(
      persona, associateType, title, description, sessionType,
    )
  } catch {
    openingMessage = sessionType === 'leadership_coaching'
      ? "What's on your mind today?"
      : "Hi, I have an appointment. I'm not sure who I should be speaking with."
  }

  await supabase.from('session_messages').insert({
    session_id: session.id,
    tenant_id: profile.tenant_id,
    role: 'assistant',
    content: openingMessage,
  })

  return { sessionId: session.id, resumed: false }
}

export async function abandonSession(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const sessionId = formData.get('sessionId') as string
  if (!sessionId) redirect('/dashboard')

  await supabase
    .from('sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')

  redirect('/dashboard')
}
