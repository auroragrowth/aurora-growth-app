alter table public.profiles
  add column if not exists trading_mode text not null default 'paper'
  check (trading_mode in ('paper', 'live'));

create table if not exists public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker text not null default 'trading212',
  mode text not null check (mode in ('paper', 'live')),
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  account_id text,
  account_currency text,
  account_type text,
  display_name text,
  is_active boolean not null default true,
  last_tested_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, broker, mode)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_broker_connections_updated_at ON public.broker_connections;
create trigger trg_broker_connections_updated_at
before update on public.broker_connections
for each row
execute function public.set_updated_at();

alter table public.broker_connections enable row level security;

create policy "Users can view their own broker connections"
on public.broker_connections
for select
using (auth.uid() = user_id);

create policy "Users can insert their own broker connections"
on public.broker_connections
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own broker connections"
on public.broker_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own broker connections"
on public.broker_connections
for delete
using (auth.uid() = user_id);
