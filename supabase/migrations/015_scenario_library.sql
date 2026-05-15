-- Add public library columns to scenarios
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Create tenant_scenario_activations
CREATE TABLE IF NOT EXISTS tenant_scenario_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  activated_by uuid NOT NULL REFERENCES auth.users(id),
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, scenario_id)
);

ALTER TABLE tenant_scenario_activations ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own activations
CREATE POLICY "tenant members read own activations"
  ON tenant_scenario_activations FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Admin/manager can activate scenarios for their tenant
CREATE POLICY "admin manager insert activations"
  ON tenant_scenario_activations FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Admin/manager can deactivate scenarios for their tenant
CREATE POLICY "admin manager delete activations"
  ON tenant_scenario_activations FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Allow reading approved public scenarios from any tenant
-- (adds to existing tenant-scoped SELECT policies)
CREATE POLICY "read approved public scenarios"
  ON scenarios FOR SELECT
  USING (is_public = true AND is_approved = true);
