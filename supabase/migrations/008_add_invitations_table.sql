CREATE TABLE IF NOT EXISTS invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'rep',
  practice_name TEXT,
  invited_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invitations_tenant_id_idx ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_tenant_email_idx ON invitations(tenant_id, email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_managers_read_invitations" ON invitations
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "admins_managers_insert_invitations" ON invitations
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "admins_managers_update_invitations" ON invitations
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );
