-- Migration: subscriptions and promo_codes tables
-- Apply via Supabase Dashboard → SQL Editor (idempotent — safe to re-run)

begin;

-- Enums
do $$ begin
  create type subscription_plan as enum ('entry', 'strategist', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'inactive', 'pilot');
exception when duplicate_object then null; end $$;

-- Subscriptions (one row per tenant)
create table if not exists subscriptions (
  id                  uuid                primary key default uuid_generate_v4(),
  tenant_id           uuid                not null unique references tenants(id) on delete cascade,
  stripe_payment_link text,
  plan                subscription_plan   not null default 'entry',
  status              subscription_status not null default 'inactive',
  promo_code          text,
  created_at          timestamptz         not null default now(),
  updated_at          timestamptz         not null default now()
);

create index if not exists subscriptions_tenant_id_idx on subscriptions(tenant_id);

create or replace trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure update_updated_at();

-- Promo codes
create table if not exists promo_codes (
  id               uuid        primary key default uuid_generate_v4(),
  code             text        unique not null,
  discount_percent integer     not null default 0
                               check (discount_percent >= 0 and discount_percent <= 100),
  max_uses         integer,
  uses_count       integer     not null default 0,
  expires_at       timestamptz,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- RLS
alter table subscriptions enable row level security;
alter table promo_codes   enable row level security;

-- Subscriptions: any tenant member can read their own tenant's subscription
drop policy if exists "subscriptions: members read" on subscriptions;
create policy "subscriptions: members read"
  on subscriptions for select
  using (tenant_id = public.tenant_id());

-- Promo codes: no direct client access — all validation goes through service role
-- (no SELECT/INSERT/UPDATE policies = RLS blocks all client reads; service role bypasses)

-- Grandfather all existing tenants: give them active subscriptions so they aren't locked out
insert into subscriptions (tenant_id, status, plan)
select id, 'active', 'entry'
from tenants
on conflict (tenant_id) do nothing;

-- Seed promo codes (idempotent)
insert into promo_codes (code, discount_percent, max_uses, is_active)
values ('SAVE20', 20, 100, true)
on conflict (code) do nothing;

insert into promo_codes (code, discount_percent, max_uses, is_active)
values
  ('PILOT-ALPHA',   100, 1, true),
  ('PILOT-BETA',    100, 1, true),
  ('PILOT-GAMMA',   100, 1, true),
  ('PILOT-DELTA',   100, 1, true),
  ('PILOT-ECHO',    100, 1, true),
  ('PILOT-FOXTROT', 100, 1, true)
on conflict (code) do nothing;

commit;
