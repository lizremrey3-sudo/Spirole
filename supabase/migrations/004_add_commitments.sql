create table commitments (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references users(id) on delete cascade,
  tenant_id  uuid        not null references tenants(id) on delete cascade,
  prompt     text        not null,
  response   text        not null,
  created_at timestamptz not null default now()
);

create index commitments_user_id_idx on commitments(user_id);

alter table commitments enable row level security;

create policy "commitments: users read own"
  on commitments for select
  using (user_id = auth.uid());

create policy "commitments: users insert own"
  on commitments for insert
  with check (user_id = auth.uid() and tenant_id = public.tenant_id());
