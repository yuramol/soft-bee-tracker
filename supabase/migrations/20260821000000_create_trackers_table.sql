-- migration: create trackers table
-- purpose: add time-tracking ledger entries linked to projects and users.
-- affected objects: types public.tracker_live_status, public.tracker_status;
--   table public.trackers; indexes and updated_at trigger
-- special risks: managers and admins may manage tracker rows belonging to other users.

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
  transaction_id uuid
);

create index trackers_project_id_idx on public.trackers (project_id);
create index trackers_user_id_idx on public.trackers (user_id);
create index trackers_transaction_id_idx on public.trackers (transaction_id);

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

create policy "users can view permitted trackers"
  on public.trackers
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.users
      where id = (select auth.uid())
        and role in ('manager', 'admin')
    )
  );

create policy "users can create permitted trackers"
  on public.trackers
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.users
      where id = (select auth.uid())
        and role in ('manager', 'admin')
    )
  );

create policy "users can update permitted trackers"
  on public.trackers
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.users
      where id = (select auth.uid())
        and role in ('manager', 'admin')
    )
  )
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.users
      where id = (select auth.uid())
        and role in ('manager', 'admin')
    )
  );

create policy "users can delete permitted trackers"
  on public.trackers
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.users
      where id = (select auth.uid())
        and role in ('manager', 'admin')
    )
  );

grant select, insert, update, delete on table public.trackers to authenticated;
grant all on table public.trackers to service_role;
