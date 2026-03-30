-- Add login tracking columns for welcome popup / broker prompt logic.
-- login_count: incremented on every successful login.
-- last_login: timestamp of last login.
-- welcome_popup_shown_count: how many times the T212 broker popup has been shown (max 3).

alter table public.profiles
  add column if not exists login_count integer not null default 0,
  add column if not exists last_login timestamptz,
  add column if not exists welcome_popup_shown_count integer not null default 0;

-- Add has_seen_welcome if it doesn't exist (gates the first-login welcome modal).
alter table public.profiles
  add column if not exists has_seen_welcome boolean not null default false;

-- Backfill: existing active subscribers have already been through onboarding.
update public.profiles
set
  welcome_popup_shown_count = 3,
  has_seen_welcome = true
where (plan_key is not null or plan is not null)
  and subscription_status in ('active', 'trialing');

-- Backfill: users who already dismissed the trading212 prompt.
update public.profiles
set welcome_popup_shown_count = 3
where has_seen_trading212_prompt = true
  and welcome_popup_shown_count = 0;
