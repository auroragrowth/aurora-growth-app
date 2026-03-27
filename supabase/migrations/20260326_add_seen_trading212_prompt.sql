-- Add has_seen_trading212_prompt to profiles so the broker connect modal
-- can be permanently dismissed via "Skip for now".
alter table public.profiles
  add column if not exists has_seen_trading212_prompt boolean not null default false;

-- Users who already have a confirmed Trading 212 connection don't need the prompt.
update public.profiles
set has_seen_trading212_prompt = true
where trading212_connected = true;
