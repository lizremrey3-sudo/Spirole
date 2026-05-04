-- Real World Impact: Google Reviews + Zapier external metrics
-- Run this migration in the Supabase SQL editor

-- Google Reviews and Zapier integration config per tenant
create table if not exists practice_integrations (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references tenants(id) on delete cascade,
  source     text        not null,              -- 'google_reviews'
  config     jsonb       not null default '{}', -- { "place_id": "ChIJ..." }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, source)
);

create trigger practice_integrations_updated_at
  before update on practice_integrations
  for each row execute procedure update_updated_at();

-- Time-series external metrics (Google reviews, Zapier webhooks)
create table if not exists external_metrics (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references tenants(id) on delete cascade,
  practice_id   uuid,                  -- optional sub-location
  source        text        not null,  -- 'google_reviews', 'zapier', etc.
  metric_name   text        not null,  -- 'star_rating', 'review_count', 'conversion_rate', etc.
  metric_value  numeric     not null,
  recorded_date date        not null,
  created_at    timestamptz not null default now(),
  unique(tenant_id, source, metric_name, recorded_date)
);

create index if not exists external_metrics_tenant_date_idx
  on external_metrics(tenant_id, recorded_date desc);

-- RLS
alter table practice_integrations enable row level security;
alter table external_metrics      enable row level security;

-- practice_integrations: all members can see if integration is configured; only admins write
create policy "practice_integrations: tenant members read"
  on practice_integrations for select
  using (tenant_id = public.tenant_id());

create policy "practice_integrations: admin insert"
  on practice_integrations for insert
  with check (tenant_id = public.tenant_id() and public.user_role() = 'admin');

create policy "practice_integrations: admin update"
  on practice_integrations for update
  using (tenant_id = public.tenant_id() and public.user_role() = 'admin');

-- external_metrics: manager/admin can read; inserts only via service role (cron + webhook)
create policy "external_metrics: manager/admin read"
  on external_metrics for select
  using (tenant_id = public.tenant_id() and public.user_role() in ('manager', 'admin'));
