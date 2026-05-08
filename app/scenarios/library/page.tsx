export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/app/dashboard/dashboard-nav'
import LibraryClient, { type SharedScenario, type Customization } from './library-client'

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

  const [scenariosResult, customizationsResult] = await Promise.all([
    supabase
      .from('scenarios')
      .select('id, title, category, core_skill, difficulty, associate_type, description')
      .eq('is_shared', true)
      .eq('is_active', true)
      .order('category', { ascending: true }),
    supabase
      .from('office_scenario_customizations')
      .select('*')
      .eq('tenant_id', tenantId),
  ])

  const scenarios = (scenariosResult.data ?? []) as SharedScenario[]
  const customizations = (customizationsResult.data ?? []) as Customization[]

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <DashboardNav email={user.email ?? ''} role={profile.role ?? undefined} />

      <main className="mx-auto w-full max-w-6xl flex-1 min-w-0 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Scenario Library</h1>
          <p className="mt-1 text-sm text-white/50">
            Shared scenarios — customize for your office, then enable for your team.
          </p>
        </div>

        <LibraryClient
          scenarios={scenarios}
          initialCustomizations={customizations}
          tenantId={tenantId}
        />
      </main>
    </div>
  )
}
