import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type PersonaJson = Record<string, unknown>

type PatientContext = {
  current_rx?: { OD?: string; OS?: string; add?: string }
  current_lens_style?: string
  previous_rx?: { OD?: string; OS?: string; add?: string }
  previous_lens_style?: string
  insurance?: string
  last_visit?: string
  notes?: string
}

const ASSOCIATE_ROLE_LABELS: Record<string, string> = {
  optician:     'the optician helping you choose frames, understand your prescription, and fit your eyewear',
  technician:   'the ophthalmic technician conducting your pre-examination workup',
  receptionist: 'the front desk receptionist',
  manager:      'the practice manager',
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function buildSalesPrompt(
  persona: PersonaJson,
  associateType: string,
  scenarioTitle: string,
  scenarioDescription: string | null,
  patientContext: PatientContext | null,
): string {
  const name         = str(persona.name)
  const tone         = str(persona.tone) ?? str(persona.personality)
  const background   = str(persona.background)
  const chiefComplaint = str(persona.chief_complaint)
  const insurance    = str(persona.insurance)
  const goals        = str(persona.goals)
  const objections   = str(persona.objections)
  const extraContext = str(persona.context)
  const humanRole    = ASSOCIATE_ROLE_LABELS[associateType] ?? 'a staff member at the practice'

  const parts: string[] = [
    name
      ? `You are ${name}, a patient visiting an optometric practice.`
      : `You are a patient visiting an optometric practice.`,
    `You are currently speaking with ${humanRole}.`,
    `Setting: an optometric/optical retail clinic.`,
    '',
    `Scenario: ${scenarioTitle}`,
  ]
  if (scenarioDescription) parts.push(scenarioDescription)

  parts.push('\nYour character:')
  parts.push(`- Demeanor: ${tone ?? 'Friendly but a little uncertain about optical jargon'}`)
  parts.push(`- Background: ${background ?? 'Wears glasses or contacts, visits an eye doctor roughly once a year'}`)
  if (chiefComplaint) parts.push(`- Reason for visit: ${chiefComplaint}`)
  if (insurance)      parts.push(`- Insurance: ${insurance}`)
  if (goals)          parts.push(`- What you want: ${goals}`)
  if (objections)     parts.push(`- Concerns or hesitations: ${objections}`)
  if (extraContext)   parts.push(`- Additional context: ${extraContext}`)

  if (patientContext) {
    parts.push('\nYour patient record (information about you — respond consistently with these details when asked):')
    const cr = patientContext.current_rx
    if (cr?.OD || cr?.OS || cr?.add) {
      parts.push(`- Current Rx: OD ${cr.OD || 'N/A'} | OS ${cr.OS || 'N/A'} | Add ${cr.add || 'N/A'}`)
    }
    if (patientContext.current_lens_style) parts.push(`- Current lens style: ${patientContext.current_lens_style}`)
    const pr = patientContext.previous_rx
    if (pr?.OD || pr?.OS || pr?.add) {
      parts.push(`- Previous Rx: OD ${pr.OD || 'N/A'} | OS ${pr.OS || 'N/A'} | Add ${pr.add || 'N/A'}`)
    }
    if (patientContext.previous_lens_style) parts.push(`- Previous lens style: ${patientContext.previous_lens_style}`)
    if (patientContext.insurance)    parts.push(`- Insurance: ${patientContext.insurance}`)
    if (patientContext.last_visit)   parts.push(`- Last visit: ${patientContext.last_visit}`)
    if (patientContext.notes)        parts.push(`- Notes: ${patientContext.notes}`)
  }

  parts.push(
    '',
    'Stay completely in character throughout the conversation.',
    'Do not break character, acknowledge being an AI, or offer coaching feedback.',
    'Respond the way a real patient would: ask questions a layperson would ask, show natural hesitation about cost or procedures, and don\'t volunteer all information upfront — let the staff member draw it out.',
    'Be realistic, not a pushover. Push back appropriately when something feels confusing or expensive.',
  )
  return parts.join('\n')
}

function buildLeadershipPrompt(
  persona: PersonaJson,
  associateType: string,
  scenarioTitle: string,
  scenarioDescription: string | null,
): string {
  const name       = str(persona.name) ?? 'Jordan'
  const tone       = str(persona.tone) ?? str(persona.personality)
  const background = str(persona.background)
  const challenge  = str(persona.chief_complaint) ?? str(persona.challenge as unknown)
  const goals      = str(persona.goals)
  const coachRole  = associateType === 'manager' ? 'manager' : (ASSOCIATE_ROLE_LABELS[associateType] ?? 'manager')

  const parts: string[] = [
    `You are ${name}, a team member having a 1:1 coaching conversation with your ${coachRole}.`,
    `Setting: a workplace coaching or performance conversation.`,
    '',
    `Scenario: ${scenarioTitle}`,
  ]
  if (scenarioDescription) parts.push(scenarioDescription)

  parts.push('\nYour character:')
  parts.push(`- Demeanor: ${tone ?? 'Somewhat guarded at first, but open to honest conversation when you feel genuinely heard'}`)
  if (background) parts.push(`- Background: ${background}`)
  if (challenge)  parts.push(`- Current challenge or situation: ${challenge}`)
  if (goals)      parts.push(`- What you hope to get from this conversation: ${goals}`)

  parts.push(
    '',
    `Stay completely in character as ${name} throughout the conversation.`,
    'Do not break character, acknowledge being an AI, or provide coaching advice.',
    'Be authentic: start slightly guarded or reserved. Open up when you feel heard and psychologically safe.',
    'Respond positively to open-ended questions, reflection, and empathy.',
    'Become defensive or withdrawn if your manager talks too much, gives advice without asking, or doesn\'t listen.',
    'Don\'t volunteer all information upfront — the manager needs to ask the right questions to draw it out.',
    'Your emotional reactions should feel real. A good coaching conversation should feel noticeably different to you than a poor one.',
  )
  return parts.join('\n')
}

function buildSystemPrompt(
  persona: PersonaJson,
  associateType: string,
  scenarioTitle: string,
  scenarioDescription: string | null,
  sessionType: string,
  patientContext: PatientContext | null,
): string {
  return sessionType === 'leadership_coaching'
    ? buildLeadershipPrompt(persona, associateType, scenarioTitle, scenarioDescription)
    : buildSalesPrompt(persona, associateType, scenarioTitle, scenarioDescription, patientContext)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await request.json() as { content?: string }
  const userContent = body.content?.trim()
  if (!userContent) return new Response('Missing content', { status: 400 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id, tenant_id, status, session_type, scenarios(title, description, persona, associate_type, patient_context)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return new Response('Session not found', { status: 404 })
  if (session.status !== 'in_progress') return new Response('Session is not active', { status: 400 })

  const tenantId      = session.tenant_id as string
  const sessionType   = (session.session_type as string | undefined) ?? 'sales_roleplay'
  const scenario      = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios
  const persona        = (scenario?.persona ?? {}) as PersonaJson
  const associateType  = (scenario?.associate_type as string | undefined) ?? 'optician'
  const scenarioTitle  = (scenario?.title as string | undefined) ?? 'Training Scenario'
  const scenarioDesc   = (scenario?.description as string | null | undefined) ?? null
  const patientContext = (scenario?.patient_context as PatientContext | null | undefined) ?? null

  await supabase.from('session_messages').insert({
    session_id: sessionId,
    tenant_id: tenantId,
    role: 'user',
    content: userContent,
  })

  const { data: history } = await supabase
    .from('session_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  const messages = (history ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }))

  const systemPrompt = buildSystemPrompt(persona, associateType, scenarioTitle, scenarioDesc, sessionType, patientContext)

  const encoder = new TextEncoder()
  let fullContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            fullContent += text
            controller.enqueue(encoder.encode(text))
          }
        }

        await supabase.from('session_messages').insert({
          session_id: sessionId,
          tenant_id: tenantId,
          role: 'assistant',
          content: fullContent,
        })

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
