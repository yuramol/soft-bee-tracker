-- migration: setup auth base
-- purpose: create shared infrastructure required by all later migrations:
--   1. private schema + private.is_secure() used by the restrictive rls policy convention
--   2. public.trigger_set_updated_at() reusable updated_at trigger function
-- affected objects: schema private, function private.is_secure(), function public.trigger_set_updated_at()
-- special risks: none (additive only)

create schema if not exists private;

-- baseline session gate for the restrictive "require secure session" policy convention.
-- currently accepts any request carrying a supabase-issued jwt role; harden here
-- (e.g. aal / mfa checks) to lock down every table at once.
create or replace function private.is_secure()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated', 'service_role')
$$;

-- reusable updated_at trigger; all tables must reuse this instead of defining their own.
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
