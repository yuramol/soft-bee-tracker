-- migration: sync users email from auth
-- purpose: a confirmed email change only updates auth.users.email, so the profile kept
--   showing the old address. this copies the confirmed address into public.users.email
--   and repairs rows that already drifted.
-- affected objects: function public.handle_auth_user_email_change(); trigger
--   on_auth_user_email_changed on auth.users; data in public.users.email
-- special risks: the trigger function runs as security definer (see justification below).
--   the backfill update only touches rows whose email differs from auth.users.

-- security definer justification: the trigger fires inside the auth server's update of
-- auth.users as supabase_auth_admin, which has no update grant on public.users and no
-- rls policy there; it writes only the email column of the row with the same id.
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

revoke execute on function public.handle_auth_user_email_change() from public, anon, authenticated;

-- auth.users.email changes only once the link sent to the new address is opened,
-- so pending requests never reach the profile
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email and new.email is not null)
  execute function public.handle_auth_user_email_change();

-- safety: data-only update, scoped to profiles whose email no longer matches their
-- auth user; it repairs changes confirmed before this trigger existed. rows whose auth
-- email is already held by another profile are skipped so the unique constraint cannot
-- abort the migration; those need a manual fix.
update public.users as profile
set email = auth_user.email
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email is not null
  and profile.email is distinct from auth_user.email
  and not exists (
    select 1
    from public.users as other_profile
    where other_profile.email = auth_user.email
      and other_profile.id <> profile.id
  );
