-- ============================================================
-- Multi-tenant AI Sales Training Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- Clean slate (safe to re-run)
-- ============================================================

drop table if exists session_messages cascade;
drop table if exists sessions         cascade;
drop table if exists scenarios        cascade;
drop table if exists users            cascade;
drop table if exists tenants          cascade;

drop type if exists message_role  cascade;
drop type if exists session_status cascade;
drop type if exists user_role     cascade;

-- ============================================================
-- Enum types
-- ============================================================

create type user_role      as enum ('rep', 'manager', 'admin');
create type session_status as enum ('in_progress', 'completed', 'abandoned');
create type message_role   as enum ('user', 'assistant', 'system');
create type associate_type as enum ('manager', 'optician', 'technician', 'receptionist');

-- ============================================================
-- Tables
-- ============================================================

create table tenants (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null,
  slug       text        unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extends auth.users, one row per authenticated user
create table users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  tenant_id  uuid        not null references tenants(id) on delete cascade,
  role       user_role   not null default 'rep',
  full_name  text,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scenarios (
  id          uuid        primary key default uuid_generate_v4(),
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  title       text        not null,
  description text,
  persona     jsonb       not null default '{}',
  rubric      jsonb       not null default '{}',
  associate_type associate_type not null default 'manager',
  is_active      boolean        not null default true,
  created_by     uuid           references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table sessions (
  id           uuid           primary key default uuid_generate_v4(),
  user_id      uuid           not null references users(id) on delete cascade,
  scenario_id  uuid           not null references scenarios(id) on delete cascade,
  tenant_id    uuid           not null references tenants(id) on delete cascade,
  status       session_status not null default 'in_progress',
  score        numeric(5, 2)  check (score >= 0 and score <= 100),
  feedback     text,
  started_at   timestamptz    not null default now(),
  completed_at timestamptz,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now()
);

create table session_messages (
  id         uuid         primary key default uuid_generate_v4(),
  session_id uuid         not null references sessions(id) on delete cascade,
  tenant_id  uuid         not null references tenants(id) on delete cascade,
  role       message_role not null,
  content    text         not null,
  metadata   jsonb        not null default '{}',
  created_at timestamptz  not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index users_tenant_id_idx          on users(tenant_id);
create index scenarios_tenant_id_idx      on scenarios(tenant_id);
create index sessions_user_id_idx         on sessions(user_id);
create index sessions_scenario_id_idx     on sessions(scenario_id);
create index sessions_tenant_id_idx       on sessions(tenant_id);
create index session_messages_session_idx on session_messages(session_id);
create index session_messages_tenant_idx  on session_messages(tenant_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_updated_at   before update on tenants   for each row execute procedure update_updated_at();
create trigger users_updated_at     before update on users     for each row execute procedure update_updated_at();
create trigger scenarios_updated_at before update on scenarios for each row execute procedure update_updated_at();
create trigger sessions_updated_at  before update on sessions  for each row execute procedure update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table tenants          enable row level security;
alter table users            enable row level security;
alter table scenarios        enable row level security;
alter table sessions         enable row level security;
alter table session_messages enable row level security;

-- Stable helpers to avoid re-querying users on every row check
create or replace function public.tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from public.users where id = auth.uid()
$$;

create or replace function public.user_role()
returns user_role language sql stable security definer as $$
  select role from public.users where id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- tenants
-- ----------------------------------------------------------------

create policy "tenants: members read own tenant"
  on tenants for select
  using (id = public.tenant_id());

create policy "tenants: admin updates own tenant"
  on tenants for update
  using (id = public.tenant_id() and public.user_role() = 'admin');

-- ----------------------------------------------------------------
-- users
-- ----------------------------------------------------------------

create policy "users: read own tenant members"
  on users for select
  using (tenant_id = public.tenant_id());

create policy "users: update own profile"
  on users for update
  using (id = auth.uid());

create policy "users: admin/manager insert into own tenant"
  on users for insert
  with check (tenant_id = public.tenant_id() and public.user_role() in ('admin', 'manager'));

create policy "users: admin deletes others in own tenant"
  on users for delete
  using (tenant_id = public.tenant_id() and public.user_role() = 'admin' and id != auth.uid());

-- ----------------------------------------------------------------
-- scenarios
-- ----------------------------------------------------------------

create policy "scenarios: all tenant members read"
  on scenarios for select
  using (tenant_id = public.tenant_id());

create policy "scenarios: manager/admin create"
  on scenarios for insert
  with check (tenant_id = public.tenant_id() and public.user_role() in ('admin', 'manager'));

create policy "scenarios: manager/admin update"
  on scenarios for update
  using (tenant_id = public.tenant_id() and public.user_role() in ('admin', 'manager'));

create policy "scenarios: admin delete"
  on scenarios for delete
  using (tenant_id = public.tenant_id() and public.user_role() = 'admin');

-- ----------------------------------------------------------------
-- sessions
-- ----------------------------------------------------------------

create policy "sessions: scoped read"
  on sessions for select
  using (
    tenant_id = public.tenant_id() and (
      user_id = auth.uid() or public.user_role() in ('manager', 'admin')
    )
  );

create policy "sessions: user creates own"
  on sessions for insert
  with check (tenant_id = public.tenant_id() and user_id = auth.uid());

create policy "sessions: owner or manager/admin updates"
  on sessions for update
  using (
    tenant_id = public.tenant_id() and (
      user_id = auth.uid() or public.user_role() in ('manager', 'admin')
    )
  );

-- ----------------------------------------------------------------
-- session_messages
-- ----------------------------------------------------------------

create policy "session_messages: read mirrors session access"
  on session_messages for select
  using (
    tenant_id = public.tenant_id() and
    exists (
      select 1 from sessions s
      where s.id = session_messages.session_id
        and (s.user_id = auth.uid() or public.user_role() in ('manager', 'admin'))
    )
  );

create policy "session_messages: owner inserts into active session"
  on session_messages for insert
  with check (
    tenant_id = public.tenant_id() and
    exists (
      select 1 from sessions s
      where s.id = session_messages.session_id
        and s.user_id = auth.uid()
        and s.status = 'in_progress'
    )
  );
