'use server'

import { createClient } from '@/lib/supabase/server'
import { buildScenarioPrompts } from '@/lib/scenarios/interpolate'

export async function getScenarioForSession(
  scenarioId: string,
  tenantId: string,
  customerName: string = 'Alex'
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_merged_scenario', {
      p_scenario_id: scenarioId,
      p_tenant_id: tenantId,
    })

  if (error) throw new Error(`Failed to load scenario: ${error.message}`)
  if (!data) throw new Error('Scenario not found')
  if (!data.is_enabled) throw new Error('This scenario is disabled for your office')

  const ready = buildScenarioPrompts(data, customerName)

  return {
    scenarioId:    ready.id,
    title:         ready.title,
    category:      ready.category,
    coreSkill:     ready.core_skill,
    difficulty:    ready.difficulty,
    rubric:        ready.rubric,
    systemPrompt:  ready.ai_roleplay_prompt,
    contextForRep: ready.full_context,
    persona:       ready.persona,
  }
}
