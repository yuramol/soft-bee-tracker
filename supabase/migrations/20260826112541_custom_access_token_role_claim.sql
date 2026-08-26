-- migration: custom access token hook for user role jwt claim
-- purpose: inject public.users.role into the access token as claims.user_role so
--   rls can authorize from auth.jwt() without querying public.users on every row.
-- affected objects: function public.custom_access_token_hook(jsonb);
--   functions private.jwt_role(), private.is_manager_or_admin();
--   grants for supabase_auth_admin / api roles
-- special risks: role changes apply on next token refresh (see jwt_expiry).
--   enable [auth.hook.custom_access_token] in supabase/config.toml (and dashboard in prod).

-- security definer justification: gotrue invokes this as supabase_auth_admin during
-- jwt minting with no end-user session; it must read public.users.role past rls.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select u.role
  into user_role
  from public.users u
  where u.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'auth hook: copies public.users.role onto jwt claims.user_role at token issue/refresh';

grant usage on schema public to supabase_auth_admin;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- auth admin must be able to resolve the profile row when the hook runs
grant select on table public.users to supabase_auth_admin;

create or replace function private.jwt_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'user_role', '');
$$;

comment on function private.jwt_role() is
  'reads claims.user_role from the current jwt; null when missing (fail closed for elevated checks)';

create or replace function private.is_manager_or_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.jwt_role() in ('admin', 'manager'), false);
$$;

comment on function private.is_manager_or_admin() is
  'true when jwt user_role is admin or manager; false when claim missing';

grant execute on function private.jwt_role() to anon, authenticated, service_role;

grant execute on function private.is_manager_or_admin() to anon, authenticated, service_role;
