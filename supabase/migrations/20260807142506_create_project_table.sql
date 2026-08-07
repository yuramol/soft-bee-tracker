-- migration: create projects and project_rates tables
-- purpose: client projects that trackers hang off, plus the per-user rate mapping,
--   per epics/soft-bee-tracker-rfc.md and the /projects epic 2 workspace.
--   creates the status/type enums, both tables, rls policies and updated_at triggers.
-- affected objects: types public.project_status, public.project_type;
--   tables public.projects, public.project_rates; triggers on both tables
-- special risks: none — additive only; no security definer functions introduced

create type public.project_status as enum ('active', 'archived');

create type public.project_type as enum ('fixed_price', 'non_profit', 'time_material');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  note text,
  picture_url text,
  -- free-text client name rather than an fk: clients have no user_role yet, and
  -- system projects (e.g. 'vacation', 'sickness') have no client at all.
  client varchar(255),
  type public.project_type not null,
  status public.project_status not null default 'active',
  start_date date,
  end_date date,
  manager_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'client projects; trackers and per-user rates reference these rows';

create index projects_manager_id_idx on public.projects (manager_id);

create index projects_status_idx on public.projects (status);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.trigger_set_updated_at();

create table public.project_rates (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  rate numeric(10, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

comment on table public.project_rates is 'per-user rate on a project; membership in this table is what assigns a user to a project';

-- the composite pk already indexes project_id first; this covers lookups by user
create index project_rates_user_id_idx on public.project_rates (user_id);

create trigger set_project_rates_updated_at
  before update on public.project_rates
  for each row execute function public.trigger_set_updated_at();

alter table public.projects enable row level security;

-- restrictive convention gate: every request must pass private.is_secure()
create policy "require secure session"
  on public.projects
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- select: manager, admin/manager role, or assigned via project_rates
create policy "projects_select_visible"
  on public.projects
  for select
  to authenticated
  using (
    manager_id = (select auth.uid())
    or (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
    or exists (
      select 1
      from public.project_rates pr
      where pr.project_id = projects.id
        and pr.user_id = (select auth.uid())
    )
  );

create policy "projects_insert_management"
  on public.projects
  for insert
  to authenticated
  with check (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

create policy "projects_update_management"
  on public.projects
  for update
  to authenticated
  using (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  )
  with check (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

create policy "projects_delete_management"
  on public.projects
  for delete
  to authenticated
  using (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

grant select, insert, update, delete on table public.projects to authenticated;

grant all on table public.projects to service_role;

alter table public.project_rates enable row level security;

-- restrictive convention gate: every request must pass private.is_secure()
create policy "require secure session"
  on public.project_rates
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- deliberately does not join public.projects: the projects select policy already
-- reads this table, and a reference back would make the two policies mutually
-- recursive (postgres raises "infinite recursion detected in policy").
create policy "project_rates_select_visible"
  on public.project_rates
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

-- rates are pay/billing data: only management assigns users and sets amounts.
create policy "project_rates_insert_management"
  on public.project_rates
  for insert
  to authenticated
  with check (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

create policy "project_rates_update_management"
  on public.project_rates
  for update
  to authenticated
  using (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  )
  with check (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

create policy "project_rates_delete_management"
  on public.project_rates
  for delete
  to authenticated
  using (
    (select u.role from public.users u where u.id = (select auth.uid())) in ('admin', 'manager')
  );

grant select, insert, update, delete on table public.project_rates to authenticated;

grant all on table public.project_rates to service_role;
