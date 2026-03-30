-- Atomic increment of login_count + update last_login.
create or replace function public.increment_login_count(uid uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set login_count = login_count + 1,
      last_login  = now()
  where id = uid;
$$;
