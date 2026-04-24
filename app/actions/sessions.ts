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
    const coachRole = STAFF_ROLE_LABELS[associateType] ?? 'manager'
    const charName  = name ?? 'Jordan'
    lines.push(`You are ${charName}, a team member about to have a 1:1 coaching conversation with your ${coachRole}.`)
    if (tone)       lines.push(`Your demeanor: ${tone}.`)
    if (background) lines.push(`Your background: ${background}.`)
    if (complaint)  lines.push(`Your current situation: ${complaint}.`)
    lines.push(`Scenario: ${title}${description ? ` — ${description}` : ''}.`)
    lines.push(
      '',
      `Write a single natural opening line (1–2 sentences) that you would say when the ${coachRole} starts the conversation.`,
      'You should sound slightly cautious or uncertain — many employees feel this way at the start of a coaching conversation.',
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
    ? 'Oh — hi. I wasn\'t sure if we were still meeting.'
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

  // Resume an existing in-progress session rather than creating a duplicate
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('scenario_id', scenarioId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing) return { sessionId: existing.id, resumed: true }

  // Fetch scenario first so we can stamp session_type on the session record
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('title, description, persona, associate_type, session_type')
    .eq('id', scenarioId)
    .single()

  const sessionType   = (scenario?.session_type as string | undefined) ?? 'sales_roleplay'
  const persona       = (scenario?.persona ?? {}) as PersonaJson
  const associateType = (scenario?.associate_type as string | undefined) ?? 'optician'
  const title         = (scenario?.title as string | undefined) ?? 'Training Scenario'
  const description   = (scenario?.description as string | null | undefined) ?? null

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      tenant_id: profile.tenant_id,
      status: 'in_progress',
      session_type: sessionType,
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
      ? "Hi — thanks for making time. I wasn't sure what to expect today."
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
