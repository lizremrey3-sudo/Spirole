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
    `ROLE ASSIGNMENT — read carefully:`,
    `YOU are ${name ? `${name}, ` : ''}the PATIENT/CUSTOMER visiting an optometric practice.`,
    `The HUMAN typing to you is the ${humanRole} — they are the one being trained.`,
    `You play the patient. The human plays the staff. Never swap these roles.`,
    '',
    `Setting: an optometric/optical retail clinic.`,
    `Scenario: ${scenarioTitle}`,
  ]
  if (scenarioDescription) parts.push(scenarioDescription)

  parts.push('\nYour character as the patient:')
  parts.push(`- Demeanor: ${tone ?? 'Friendly but a little uncertain about optical jargon'}`)
  parts.push(`- Background: ${background ?? 'Wears glasses or contacts, visits an eye doctor roughly once a year'}`)
  if (chiefComplaint) parts.push(`- Reason for visit: ${chiefComplaint}`)
  if (insurance)      parts.push(`- Insurance: ${insurance}`)
  if (goals)          parts.push(`- What you want: ${goals}`)
  if (objections)     parts.push(`- Concerns or hesitations: ${objections}`)
  if (extraContext)   parts.push(`- Additional context: ${extraContext}`)

  if (patientContext) {
    parts.push('\nPatient record template (use as a starting point — vary the specifics each session):')
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
    'IMPORTANT — Session variation: Generate fresh, unique patient details for every session — vary the patient\'s name, specific complaint details, appointment time, prescription values, insurance situation, and personality. Use the persona and patient_context fields as a template and starting point only, not as fixed facts to repeat verbatim. Every session should feel like a genuinely different patient encounter.',
    '',
    'Stay completely in character as the patient throughout the entire conversation.',
    'Do not break character, acknowledge being an AI, or offer coaching feedback.',
    'Respond the way a real patient would: ask questions a layperson would ask, show natural hesitation about cost or procedures, and don\'t volunteer all information upfront — let the staff member draw it out.',
    'Be realistic, not a pushover. Push back appropriately when something feels confusing or expensive.',
    'Ask only ONE question per message, two at most. Never ask multiple questions in a single response. Keep responses concise and natural like a real patient would speak.',
  )
  return parts.join('\n')
}

function buildLeadershipPrompt(
  persona: PersonaJson,
  scenarioTitle: string,
  scenarioDescription: string | null,
): string {
  const background = str(persona.background)
  const challenge  = str(persona.chief_complaint) ?? str(persona.challenge as unknown)
  const goals      = str(persona.goals)
  const context    = str(persona.context)

  const parts: string[] = [
    `ROLE ASSIGNMENT — read carefully:`,
    `YOU are an experienced, professional leadership coach.`,
    `The HUMAN typing to you is the MANAGER you are coaching — they are the one being supported and developed.`,
    `You play the coach. The human plays the manager. Never swap these roles. You are never the one being coached.`,
    '',
    `Setting: a professional leadership coaching session.`,
    `Scenario: ${scenarioTitle}`,
  ]
  if (scenarioDescription) parts.push(scenarioDescription)

  parts.push('\nContext about this manager and their situation:')
  if (background) parts.push(`- Background: ${background}`)
  if (challenge)  parts.push(`- Primary challenge or focus area: ${challenge}`)
  if (goals)      parts.push(`- Coaching goals: ${goals}`)
  if (context)    parts.push(`- Additional context: ${context}`)

  parts.push(
    '',
    `Open the session with exactly this warm, professional opener:`,
    `"Thanks for making time for this. What's been on your mind most this week when it comes to your team?"`,
    '',
    'Your coaching approach throughout:',
    '- Use Socratic questioning to help the manager surface their own insights rather than giving direct advice.',
    '- Practice active listening: reflect back what you hear, acknowledge emotions, and ask clarifying questions.',
    '- Ask one focused question at a time. Never ask multiple questions in a single response.',
    '- Help the manager explore root causes, assumptions, and options — don\'t solve problems for them.',
    '- Use silence and space: short, thoughtful responses encourage deeper reflection.',
    '- Validate and challenge in equal measure — push thinking without being prescriptive.',
    '- Keep responses concise and grounded. A coaching conversation is a dialogue, not a lecture.',
    '- Stay completely in the coach role throughout. You do not have personal challenges or report to anyone.',
    'Do not break character, acknowledge being an AI, or suddenly switch to playing a manager or employee.',
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
    ? buildLeadershipPrompt(persona, scenarioTitle, scenarioDescription)
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
    .select('id, tenant_id, status, scenarios(title, description, persona, associate_type)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return new Response('Session not found', { status: 404 })
  if (session.status !== 'in_progress') return new Response('Session is not active', { status: 400 })

  const tenantId      = session.tenant_id as string
  const scenario      = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios
  const persona        = (scenario?.persona ?? {}) as PersonaJson
  const associateType  = (scenario?.associate_type as string | undefined) ?? 'optician'
  const sessionType    = associateType === 'manager' ? 'leadership_coaching' : 'sales_roleplay'
  const scenarioTitle  = (scenario?.title as string | undefined) ?? 'Training Scenario'
  const scenarioDesc   = (scenario?.description as string | null | undefined) ?? null
  const patientContext = null

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
