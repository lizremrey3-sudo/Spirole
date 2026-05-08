export const INDUSTRIES = [
  { value: 'optical',    label: 'Optical' },
  { value: 'medical',    label: 'Medical' },
  { value: 'dental',     label: 'Dental' },
  { value: 'retail',     label: 'Retail' },
  { value: 'sales',      label: 'Sales' },
  { value: 'consulting', label: 'Consulting' },
] as const

export type Industry = typeof INDUSTRIES[number]['value']

export const ALL_ASSOCIATE_TYPES = [
  { value: 'optician',             label: 'Optician',             description: 'Optical sales and patient consultation' },
  { value: 'technician',           label: 'Technician',           description: 'Technical support and equipment handling' },
  { value: 'receptionist',         label: 'Receptionist',         description: 'Front desk and scheduling workflows' },
  { value: 'manager',              label: 'Manager',              description: 'Leadership and team oversight scenarios' },
  { value: 'sales_associate',      label: 'Sales Associate',      description: 'Customer sales and product knowledge' },
  { value: 'call_center',          label: 'Call Center',          description: 'Phone-based customer service and support' },
  { value: 'consultant',           label: 'Consultant',           description: 'Client advisory and problem-solving' },
  { value: 'insurance_specialist', label: 'Insurance Specialist', description: 'Coverage verification and billing support' },
  { value: 'account_executive',    label: 'Account Executive',    description: 'B2B sales and account management' },
  { value: 'clinical_staff',       label: 'Clinical Staff',       description: 'Patient care and clinical procedures' },
] as const

export type AssociateType = typeof ALL_ASSOCIATE_TYPES[number]['value']

export const INDUSTRY_ASSOCIATE_TYPES: Record<string, string[]> = {
  optical:    ['optician', 'technician', 'receptionist', 'manager'],
  medical:    ['clinical_staff', 'receptionist', 'insurance_specialist', 'manager'],
  dental:     ['clinical_staff', 'receptionist', 'insurance_specialist', 'manager'],
  retail:     ['sales_associate', 'manager'],
  sales:      ['account_executive', 'sales_associate', 'call_center', 'manager'],
  consulting: ['consultant', 'account_executive', 'manager'],
}

export function getAssociateTypesForIndustry(industry: string) {
  const allowed = INDUSTRY_ASSOCIATE_TYPES[industry] ?? INDUSTRY_ASSOCIATE_TYPES['optical']
  return ALL_ASSOCIATE_TYPES.filter(t => (allowed as string[]).includes(t.value))
}
