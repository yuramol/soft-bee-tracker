-- migration: enforce blocking in the database and confirm accepted invites
-- purpose:
--   1. (SBT-63) blocking was enforced only by the next.js app. a blocked user could still
--      sign in straight against supabase auth, get a token carrying their role, and read or
--      write through the data api. now:
--        - private.is_secure(), the restrictive gate on every api table, refuses blocked users,
--          so a block takes effect on their very next request, token or not
--        - the access token hook gives blocked users no user_role claim (fail closed in the
--          proxy, page guards and private.is_manager_or_admin())
--      a blocked user may still read their own users and user_access rows, so the app can
--      show "your account is blocked" instead of a generic error. they cannot write anything.
--   2. (SBT-55 follow-up) nothing set user_access.is_confirmed after an invite was accepted,
--      so invited people stayed "pending" in crew forever. confirming the email in supabase
--      auth (accepting the invite, or a sign-up confirmation) now marks them confirmed.
-- affected objects: functions private.has_api_role(), private.is_not_blocked(),
--   private.is_secure(), private.custom_access_token_hook(jsonb), private.handle_user_confirmed();
--   policies "require secure session" on public.users and public.user_access;
--   trigger on_auth_user_confirmed on auth.users; data in public.user_access (backfill)
-- special risks:
--   - is_secure() now reads public.user_access once per statement (primary key lookup; policies
--     call it as (select private.is_secure()), so it is evaluated once, not per row).
--   - blocked users lose all api access immediately, including any open session.
--   - the backfill marks everyone whose email auth already confirmed as confirmed.

-- ---------------------------------------------------------------------------
-- 1. blocking
-- ---------------------------------------------------------------------------

-- the original is_secure() check, kept as its own function so the users and user_access
-- gates can combine it with an own-row exception below
create or replace function private.has_api_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated', 'service_role')
$$;

comment on function private.has_api_role() is
  'true when the request carries a supabase-issued api role (anon, authenticated, service_role)';

-- security definer: user_access is itself guarded by a policy that calls is_secure(), so
-- reading it as the caller from inside is_secure() would recurse. it reads one column of the
-- caller's own row and returns a boolean; nothing else is exposed.
create or replace function private.is_not_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.user_access ua
    where ua.user_id = (select auth.uid())
      and ua.is_blocked
  )
$$;

comment on function private.is_not_blocked() is
  'false when the signed-in user is blocked; true for anon and service sessions';

create or replace function private.is_secure()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_api_role() and private.is_not_blocked()
$$;

comment on function private.is_secure() is
  'gate for every api table: a supabase api role and not a blocked user';

grant execute on function private.has_api_role() to anon, authenticated, service_role;
grant execute on function private.is_not_blocked() to anon, authenticated, service_role;

-- users and user_access: a blocked user may still read their own row (the app needs it to
-- say why they were signed out), but every write needs the full is_secure() check.
-- safety: drop + create replaces each policy in place; the permissive policies are untouched.
drop policy "require secure session" on public.users;

create policy "require secure session"
  on public.users
  as restrictive
  for all
  to anon, authenticated
  using (
    (select private.has_api_role())
    and ((select private.is_not_blocked()) or id = (select auth.uid()))
  )
  with check ((select private.is_secure()));

drop policy "require secure session" on public.user_access;

create policy "require secure session"
  on public.user_access
  as restrictive
  for all
  to anon, authenticated
  using (
    (select private.has_api_role())
    and ((select private.is_not_blocked()) or user_id = (select auth.uid()))
  )
  with check ((select private.is_secure()));

-- same hook as 20261106123719, plus: a blocked user gets no role claim
create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  claims jsonb;
  user_role public.user_role;
  is_blocked boolean;
begin
  select ua.role, ua.is_blocked
  into user_role, is_blocked
  from public.user_access ua
  where ua.user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_role is not null and not coalesce(is_blocked, false) then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

comment on function private.custom_access_token_hook(jsonb) is
  'auth hook: copies public.user_access.role onto jwt claims.user_role at token issue/refresh; null for blocked users';

-- ---------------------------------------------------------------------------
-- 2. confirm accepted invites
-- ---------------------------------------------------------------------------

-- security definer: fires inside supabase auth's own update of auth.users, with no user
-- session and as an auth role that has no rights on public.user_access.
create or replace function private.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_access
  set is_confirmed = true
  where user_id = new.id
    and not is_confirmed;

  return new;
end;
$$;

comment on function private.handle_user_confirmed() is
  'marks public.user_access.is_confirmed once supabase auth confirms the email';

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.handle_user_confirmed();

-- backfill: people who already accepted an invite before this trigger existed
update public.user_access ua
set is_confirmed = true
from auth.users au
where au.id = ua.user_id
  and au.email_confirmed_at is not null
  and not ua.is_confirmed;
