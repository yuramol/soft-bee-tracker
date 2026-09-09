-- migration: create projects table
-- purpose: add projects and per-user project rates, including the enums and
--   relationships required by the projects domain.
-- affected objects: types public.project_status, public.project_type;
--   tables public.projects, public.project_rates; indexes and updated_at triggers
-- special risks: the new tables are intentionally unavailable to api roles until
--   feature-specific permissive rls policies and least-privilege grants are added.

create type public.project_status as enum ('active', 'archived');

create type public.project_type as enum ('fixed_price', 'non_profit', 'time_material');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name varchar(255) not null unique,
  client varchar(255) not null,
  note text,
  picture_url text,
  start_date date,
  end_date date,
  status public.project_status not null default 'active',
  type public.project_type not null,
  manager_id uuid references public.users (id) on delete set null
);

create table public.project_rates (
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  rate numeric(10, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- PostgreSQL does not create indexes for foreign keys automatically. The
-- project_rates primary key already covers project_id as its leading column.
create index projects_manager_id_idx on public.projects (manager_id);
create index project_rates_user_id_idx on public.project_rates (user_id);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.trigger_set_updated_at();

create trigger set_project_rates_updated_at
  before update on public.project_rates
  for each row execute function public.trigger_set_updated_at();

alter table public.projects enable row level security;
alter table public.project_rates enable row level security;

-- Reuse the repository-wide restrictive session gate. No permissive policies
-- are added yet because the projects authorization model is not part of this migration.
create policy "require secure session"
  on public.projects
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "require secure session"
  on public.project_rates
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- New Supabase projects no longer expose public tables to the Data API by
-- default. Keep application roles ungranted until their RLS policies exist.
grant all on table public.projects, public.project_rates to service_role;
