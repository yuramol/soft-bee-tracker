-- purpose: users created with their email already confirmed start confirmed.
--   20261113110305 marks user_access.is_confirmed when email_confirmed_at goes from
--   null to set (accepting an invite). a user inserted already confirmed (admin
--   create_user with email_confirm, sign-up with confirmations off, seeds) never
--   takes that path, so the signup trigger now copies the state on insert.
-- affected objects: function public.handle_new_user() (body only: the user_access
--   insert now sets is_confirmed); user_access rows of already-confirmed users.
-- special risks: none. the function keeps its signature, security invoker and
--   search_path; the users insert is unchanged. the backfill only sets
--   is_confirmed = true for users whose auth email is confirmed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    phone,
    linkedin,
    upwork
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'linkedin', ''),
    nullif(new.raw_user_meta_data ->> 'upwork', '')
  );

  -- an account created already confirmed has no null -> set update for
  -- private.handle_user_confirmed() to catch, so record it here
  insert into public.user_access (user_id, is_confirmed)
  values (new.id, new.email_confirmed_at is not null);

  return new;
end;
$$;

-- backfill: anyone created confirmed between 20261113110305 and this migration
update public.user_access ua
set is_confirmed = true
from auth.users au
where au.id = ua.user_id
  and au.email_confirmed_at is not null
  and not ua.is_confirmed;
