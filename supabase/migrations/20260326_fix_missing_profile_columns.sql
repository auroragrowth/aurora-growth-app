-- Add missing columns that were not applied from earlier migrations.
alter table public.profiles
  add column if not exists trading_mode text not null default 'paper',
  add column if not exists has_seen_welcome_popup boolean not null default false,
  add column if not exists has_seen_plan_selection boolean not null default false,
  add column if not exists has_completed_onboarding boolean not null default false,
  add column if not exists has_completed_plan_selection boolean not null default false,
  add column if not exists trading212_mode text,
  add column if not exists trading212_connected boolean not null default false,
  add column if not exists has_seen_trading212_prompt boolean not null default false,
  add column if not exists onboarding_step text not null default 'welcome',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz;

-- Backfill: existing active subscribers are past onboarding.
update public.profiles
set
  has_seen_welcome_popup     = true,
  has_seen_plan_selection    = true,
  has_completed_onboarding   = true,
  has_completed_plan_selection = true,
  onboarding_step            = 'completed'
where (plan_key is not null or plan is not null)
  and subscription_status in ('active', 'trialing');

-- Backfill: users with active trading212 connections.
update public.profiles p
set
  trading212_connected = true,
  trading_mode = c.mode,
  has_seen_trading212_prompt = true
from public.trading212_connections c
where c.user_id = p.id
  and c.is_connected = true
  and c.is_active = true;
