CREATE TABLE IF NOT EXISTS performance_metrics (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id    UUID     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_number  SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  metric_name  TEXT     NOT NULL,
  metric_value NUMERIC  NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_number, metric_name)
);

CREATE INDEX IF NOT EXISTS performance_metrics_user_id_idx   ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS performance_metrics_tenant_id_idx ON performance_metrics(tenant_id);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_metrics" ON performance_metrics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.tenant_id()
  );

CREATE POLICY "users_update_own_metrics" ON performance_metrics
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "managers_read_team_metrics" ON performance_metrics
  FOR SELECT USING (
    tenant_id = public.tenant_id()
    AND public.user_role() IN ('admin', 'manager')
  );
