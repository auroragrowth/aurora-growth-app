-- =============================================================
-- fix_broker_connections.sql
-- Single source of truth for the broker_connections table.
-- Drops and recreates the table, RLS policies, indexes, and
-- the updated_at trigger.
--
-- Run manually in the Supabase SQL editor.
-- =============================================================

-- 1. Drop existing table (cascades policies, triggers, indexes)
drop table if exists public.broker_connections cascade;

-- 2. Recreate table with all required columns
create table public.broker_connections (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  broker               text        not null,
  mode                 text        not null check (mode in ('paper', 'live')),
  api_key_encrypted    text        not null,
  api_secret_encrypted text,
  account_id           text,
  account_currency     text,
  account_type         text,
  display_name         text,
  is_active            boolean     not null default true,
  last_tested_at       timestamptz,
  last_sync_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint broker_connections_user_broker_mode_key
    unique (user_id, broker, mode)
);

-- 3. Index on user_id for fast lookups
create index idx_broker_connections_user_id
  on public.broker_connections (user_id);

-- 4. Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_broker_connections_updated_at
  before update on public.broker_connections
  for each row
  execute function public.set_updated_at();

-- 5. Enable RLS — users can only access their own rows
alter table public.broker_connections enable row level security;

create policy "Users can view their own broker connections"
  on public.broker_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own broker connections"
  on public.broker_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own broker connections"
  on public.broker_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own broker connections"
  on public.broker_connections for delete
  using (auth.uid() = user_id);

-- 6. Grant access to authenticated role (required for RLS to work)
grant select, insert, update, delete
  on public.broker_connections
  to authenticated;
