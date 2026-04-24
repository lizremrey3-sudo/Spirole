-- Migration: add session_type enum and columns
-- Apply via: supabase db push  OR paste into Supabase Dashboard → SQL Editor

begin;

create type session_type as enum ('sales_roleplay', 'leadership_coaching');

-- Add to scenarios so admins can tag each scenario
alter table scenarios
  add column session_type session_type not null default 'sales_roleplay';

-- Add to sessions so the evaluation route knows which rubric to apply
alter table sessions
  add column session_type session_type not null default 'sales_roleplay';

commit;
