create table if not exists public.user_onboarding_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  day_number integer not null check (day_number >= 0 and day_number <= 7),
  subject text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists user_onboarding_emails_user_day_idx
  on public.user_onboarding_emails (user_id, day_number);

create index if not exists user_onboarding_emails_user_idx
  on public.user_onboarding_emails (user_id);

create index if not exists user_onboarding_emails_sent_at_idx
  on public.user_onboarding_emails (sent_at desc);
