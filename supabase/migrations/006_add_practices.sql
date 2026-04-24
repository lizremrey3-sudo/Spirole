CREATE TABLE practices (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  manager_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN practice_id UUID REFERENCES practices(id) ON DELETE SET NULL;

CREATE TABLE assessments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  practice_id  UUID        REFERENCES practices(id) ON DELETE CASCADE,
  content      JSONB       NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX practices_tenant_idx    ON practices(tenant_id);
CREATE INDEX assessments_tenant_idx  ON assessments(tenant_id);
CREATE INDEX assessments_practice_idx ON assessments(practice_id);

ALTER TABLE practices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practices: tenant members read"
  ON practices FOR SELECT
  USING (tenant_id = public.tenant_id());

CREATE POLICY "practices: admin insert"
  ON practices FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id() AND public.user_role() = 'admin');

CREATE POLICY "practices: admin update"
  ON practices FOR UPDATE
  USING (tenant_id = public.tenant_id() AND public.user_role() = 'admin');

CREATE POLICY "assessments: tenant members read"
  ON assessments FOR SELECT
  USING (tenant_id = public.tenant_id());

CREATE POLICY "assessments: manager/admin insert"
  ON assessments FOR INSERT
  WITH CHECK (tenant_id = public.tenant_id() AND public.user_role() IN ('admin', 'manager'));
