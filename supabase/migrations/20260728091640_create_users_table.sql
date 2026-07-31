-- migration: create users table
-- purpose: extended user profiles backing supabase auth, per epic 1 (development-auth).
--   creates role/salary enums, public.users, rls policies, updated_at trigger, and the
--   auth.users signup trigger that populates public.users from raw_user_meta_data.
-- affected objects: types public.user_role, public.salary_type; table public.users;
--   function public.handle_new_user(); triggers on public.users and auth.users
-- special risks: trigger on auth.users runs as security definer (see justification below)

create type public.user_role as enum ('worker', 'manager', 'admin');

create type public.salary_type as enum ('hourly', 'fixed', 'project');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'worker',
  date_employment date,
  positions jsonb,
  salary numeric,
  salary_info text,
  type_salary public.salary_type,
  linkedin text,
  upwork text,
  is_confirmed boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'extended profiles for auth.users, populated by handle_new_user trigger from signup metadata';

create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.trigger_set_updated_at();

alter table public.users enable row level security;

-- restrictive convention gate: every request must pass private.is_secure()
create policy "require secure session"
  on public.users
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- users may read their own profile; broader visibility (manager/admin views)
-- will be added when those features land.
create policy "users can view own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- users may update their own profile row. column-level protection of privileged
-- flags (role, is_blocked, is_confirmed, salary fields) is deferred to the admin
-- epic; until then only the signup trigger and service role write those.
create policy "users can update own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- no insert/delete policies on purpose: rows are created by the signup trigger
-- below and removed via the auth.users cascade.

-- security definer justification: this trigger fires during supabase auth signup
-- (no user session yet) and must insert into public.users bypassing rls.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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
    upwork,
    role,
    is_confirmed,
    is_blocked
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'linkedin', ''),
    nullif(new.raw_user_meta_data ->> 'upwork', ''),
    -- role is forced to 'worker' regardless of client-sent metadata to prevent
    -- privilege escalation via a crafted signup payload; admins promote users later.
    'worker',
    -- confirmation/block flags are likewise server-enforced, never client-trusted.
    false,
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
