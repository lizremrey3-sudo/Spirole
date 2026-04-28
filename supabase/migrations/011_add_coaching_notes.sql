CREATE TABLE IF NOT EXISTS coaching_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, manager_id)
);

CREATE INDEX IF NOT EXISTS coaching_notes_session_id_idx ON coaching_notes(session_id);
CREATE INDEX IF NOT EXISTS coaching_notes_tenant_id_idx  ON coaching_notes(tenant_id);
CREATE INDEX IF NOT EXISTS coaching_notes_manager_id_idx ON coaching_notes(manager_id);

CREATE TRIGGER coaching_notes_updated_at
  BEFORE UPDATE ON coaching_notes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

ALTER TABLE coaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_read_coaching_notes" ON coaching_notes
  FOR SELECT USING (
    tenant_id = public.tenant_id()
    AND public.user_role() IN ('admin', 'manager')
  );

CREATE POLICY "managers_insert_coaching_notes" ON coaching_notes
  FOR INSERT WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() IN ('admin', 'manager')
    AND manager_id = auth.uid()
  );

CREATE POLICY "managers_update_coaching_notes" ON coaching_notes
  FOR UPDATE USING (
    manager_id = auth.uid()
    AND public.user_role() IN ('admin', 'manager')
  );
