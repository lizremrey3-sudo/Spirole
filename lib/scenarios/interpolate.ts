export interface ScenarioContext {
  brand_name: string
  industry: string
  product_type: string
  price_point_low: string
  price_point_high: string
  customer_name: string
  regional_notes?: string
  custom_context?: string
}

export function interpolateScenario(template: string, context: ScenarioContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key as keyof ScenarioContext]
    return value !== undefined && value !== '' ? value : match
  })
}

export function buildScenarioPrompts(
  merged: Record<string, any>,
  customerName: string
): Record<string, any> {
  const context: ScenarioContext = {
    brand_name:       merged.brand_name,
    industry:         merged.industry,
    product_type:     merged.product_type,
    price_point_low:  merged.price_point_low,
    price_point_high: merged.price_point_high,
    customer_name:    customerName,
    regional_notes:   merged.regional_notes,
    custom_context:   merged.custom_context,
  }

  return {
    ...merged,
    ai_roleplay_prompt: interpolateScenario(merged.ai_roleplay_prompt, context),
    base_context:       interpolateScenario(merged.base_context, context),
    full_context: [
      interpolateScenario(merged.base_context, context),
      merged.custom_context ? `\n\nOffice context: ${merged.custom_context}` : ''
    ].join('').trim(),
  }
}
