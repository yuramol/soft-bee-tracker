-- migration: create user_access table
-- purpose: move role and access status out of the user-editable public.users
-- affected objects: table public.user_access; functions public.handle_new_user(),
--   public.custom_access_token_hook(jsonb) moved to private; columns public.users.role, is_confirmed, is_blocked
-- special risks: drops columns on public.users after copying their data. the auth hook uri must
--   point at private.custom_access_token_hook (config.toml and the dashboard) or token issue fails.

create table public.user_access (
  user_id uuid primary key references public.users (id) on delete cascade,
  role public.user_role not null default 'worker',
  is_confirmed boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_access is
  'role and access status per user (1:1 with public.users); single source for the jwt user_role claim';

create trigger set_user_access_updated_at
  before update on public.user_access
  for each row execute function public.trigger_set_updated_at();

insert into public.user_access (user_id, role, is_confirmed, is_blocked)
select u.id, u.role, u.is_confirmed, u.is_blocked
from public.users u;

alter table public.user_access enable row level security;

create policy "require secure session"
  on public.user_access
  as restrictive
  for all
  to anon, authenticated
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "user_access_select_own"
  on public.user_access
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_access_select_management"
  on public.user_access
  for select
  to authenticated
  using ((select private.is_manager_or_admin()));

-- admins only, never on their own row (no self-promotion or self-lockout)
create policy "user_access_update_admin"
  on public.user_access
  for update
  to authenticated
  using (
    (select private.jwt_role()) = 'admin'
    and user_id <> (select auth.uid())
  )
  with check (
    (select private.jwt_role()) = 'admin'
    and user_id <> (select auth.uid())
  );

-- safety: fresh stacks grant api roles everything by default, including truncate
revoke all on table public.user_access from anon, authenticated;

grant select on table public.user_access to authenticated;

grant update (role, is_confirmed, is_blocked) on table public.user_access to authenticated;

grant all on table public.user_access to service_role;

-- safety: restrictive policy is scoped to api roles because is_secure() needs a jwt,
-- and supabase_auth_admin runs the signup trigger and auth hook without one
alter policy "require secure session" on public.users
  to anon, authenticated;

grant insert on table public.users to supabase_auth_admin;

create policy "users_insert_auth_admin"
  on public.users
  for insert
  to supabase_auth_admin
  with check (true);

grant select, insert on table public.user_access to supabase_auth_admin;

create policy "user_access_select_auth_admin"
  on public.user_access
  for select
  to supabase_auth_admin
  using (true);

create policy "user_access_insert_auth_admin"
  on public.user_access
  for insert
  to supabase_auth_admin
  with check (true);

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

  insert into public.user_access (user_id)
  values (new.id);

  return new;
end;
$$;

-- safety: replaced by private.custom_access_token_hook below
drop function public.custom_access_token_hook(jsonb);

create function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select ua.role
  into user_role
  from public.user_access ua
  where ua.user_id = (event ->> 'user_id')::uuid;

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

comment on function private.custom_access_token_hook(jsonb) is
  'auth hook: copies public.user_access.role onto jwt claims.user_role at token issue/refresh';

grant usage on schema private to supabase_auth_admin;

grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;

revoke execute on function private.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- safety: data was copied into public.user_access above
alter table public.users
  drop column role,
  drop column is_confirmed,
  drop column is_blocked;
