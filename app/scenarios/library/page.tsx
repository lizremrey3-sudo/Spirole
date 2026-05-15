export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import LibraryClient from './library-client'

export default async function ScenarioLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role as string)) {
    redirect('/dashboard')
  }

  const tenantId = profile.tenant_id as string

  const { data: tenant } = await supabase
    .from('tenants')
    .select('industry')
    .eq('id', tenantId)
    .single()
  const tenantIndustry = (tenant?.industry as string | null) ?? 'optical'

  const [scenariosResult, activationsResult] = await Promise.all([
    supabase
      .from('scenarios')
      .select('id, title, description, associate_type, industry')
      .eq('is_public', true)
      .eq('is_approved', true)
      .or(`industry.eq.${tenantIndustry},industry.eq.all`)
      .order('title', { ascending: true }),
    supabase
      .from('tenant_scenario_activations')
      .select('scenario_id')
      .eq('tenant_id', tenantId),
  ])

  const scenarios = (scenariosResult.data ?? []) as {
    id: string
    title: string
    description: string | null
    associate_type: string
    industry: string
  }[]

  const activatedIds = new Set((activationsResult.data ?? []).map(a => a.scenario_id as string))

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} role={profile.role ?? undefined} />

      <main className="mx-auto w-full max-w-5xl flex-1 min-w-0 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Scenario Library</h1>
          <p className="mt-1 text-sm text-white/50">
            Activate community scenarios for your team. Activated scenarios appear alongside your own.
          </p>
        </div>

        <LibraryClient scenarios={scenarios} initialActivatedIds={[...activatedIds]} />
      </main>
    </div>
  )
}
