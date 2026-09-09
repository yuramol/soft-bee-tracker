-- migration: create trackers table
-- purpose: add time-tracking ledger entries linked to projects and users.
-- affected objects: types public.tracker_live_status, public.tracker_status;
--   table public.trackers; indexes and updated_at trigger
-- special risks: managers and admins (via jwt user_role) may manage tracker rows
--   belonging to other users, including approval status. workers may only write
--   status = 'new' and only against projects they manage or are assigned to.

create type public.tracker_live_status as enum ('finish', 'pause', 'start');

create type public.tracker_status as enum ('approved', 'new', 'rejected');

create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null,
  description text,
  duration_minutes integer not null default 0,
  is_live boolean not null default false,
  live_duration_minutes integer not null default 0,
  live_status public.tracker_live_status,
  status public.tracker_status not null default 'new',
  start_live_date timestamptz,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- no fk yet: transactions table is not part of this migration
  transaction_id uuid
);

create index trackers_project_id_idx on public.trackers (project_id);
create index trackers_user_id_idx on public.trackers (user_id);
create index trackers_date_idx on public.trackers (date);

create trigger set_trackers_updated_at
  before update on public.trackers
  for each row execute function public.trigger_set_updated_at();

alter table public.trackers enable row level security;

create policy "require secure session"
  on public.trackers
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "trackers_select_own_or_management"
  on public.trackers
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_manager_or_admin())
  );

-- project must be visible: management jwt role, project manager, or project_rates assignment
-- workers may only create status = 'new' for themselves
create policy "trackers_insert_own_or_management"
  on public.trackers
  for insert
  to authenticated
  with check (
    (
      user_id = (select auth.uid())
      or (select private.is_manager_or_admin())
    )
    and (
      (select private.is_manager_or_admin())
      or status = 'new'
    )
    and (
      (select private.is_manager_or_admin())
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.manager_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.project_rates pr
        where pr.project_id = project_id
          and pr.user_id = (select auth.uid())
      )
    )
  );

-- workers may only edit their own still-new rows, keep status = 'new', and stay on a visible project.
-- managers/admins may update any row (including approval status).
create policy "trackers_update_own_or_management"
  on public.trackers
  for update
  to authenticated
  using (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'new'
    )
  )
  with check (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'new'
      and (
        exists (
          select 1
          from public.projects p
          where p.id = project_id
            and p.manager_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.project_rates pr
          where pr.project_id = project_id
            and pr.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "trackers_delete_own_or_management"
  on public.trackers
  for delete
  to authenticated
  using (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'new'
    )
  );

grant select, insert, update, delete on table public.trackers to authenticated;
grant all on table public.trackers to service_role;
