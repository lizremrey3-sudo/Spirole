create table public.session_reactions (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.sessions(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  section     text        not null,
  reaction    text        not null check (reaction in ('up', 'down')),
  created_at  timestamptz not null default now(),
  unique (session_id, user_id, section)
);

alter table public.session_reactions enable row level security;

create policy "Users manage own reactions"
  on public.session_reactions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Managers and admins read team reactions"
  on public.session_reactions for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and tenant_id = session_reactions.tenant_id
        and role in ('manager', 'admin')
    )
  );

create index session_reactions_session_id_idx on public.session_reactions (session_id);
create index session_reactions_tenant_id_idx  on public.session_reactions (tenant_id);
