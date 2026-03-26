-- Add onboarding state tracking fields to profiles.
-- phone is collected at signup and stored here.
-- has_seen_welcome_popup / has_seen_plan_selection gate the welcome popup.
-- onboarding_step drives the post-checkout Trading 212 popup in the dashboard.
-- trading212_connected reflects real confirmed broker status (never inferred).

alter table public.profiles
  add column if not exists phone text,
  add column if not exists has_seen_welcome_popup boolean not null default false,
  add column if not exists has_seen_plan_selection boolean not null default false,
  add column if not exists has_completed_onboarding boolean not null default false,
  add column if not exists trading212_connected boolean not null default false,
  add column if not exists trading212_mode text,
  add column if not exists onboarding_step text not null default 'welcome'
    check (onboarding_step in ('welcome', 'plan_selection', 'checkout_complete', 'trading212_setup', 'completed'));

-- Existing active subscribers are already past onboarding — don't show popups.
update public.profiles
set
  has_seen_welcome_popup  = true,
  has_seen_plan_selection = true,
  has_completed_onboarding = true,
  onboarding_step          = 'completed'
where (plan_key is not null or plan is not null)
  and subscription_status in ('active', 'trialing');
