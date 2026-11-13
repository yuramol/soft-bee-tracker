-- migration: projects page backend
-- purpose: back the /projects page with real data instead of mocks, and scope project
--   access to the people on each project:
--   - project links; creating a project (with extra members) for a chosen responsible person
--   - projects.manager_id stays the one responsible person and must be a manager or admin;
--     the responsible person is always a member, and a manager who creates a project for
--     someone else stays on it
--   - project rights follow the person's role: the responsible person, or any manager/admin
--     assigned to the project, may manage it (edit, archive, delete, change members, see team
--     time); staff only log their own time on projects they are assigned to; admins keep
--     full access. previously any jwt role 'manager' could read and write every project,
--     every rate and every tracker entry.
--   - read-only lookups of project people and membership pairs for every project member
-- affected objects: column public.projects.links (new); defaults on public.projects.client
--   and public.projects.type; functions private.is_admin(), private.is_project_manager(uuid),
--   private.is_project_member(uuid); trigger functions
--   public.add_project_manager_membership(), public.validate_project_responsible() and
--   their triggers on public.projects; functions public.create_project(...),
--   public.get_project_people(), public.get_project_members(); policies on public.projects,
--   public.project_rates and public.trackers (replaced); data in public.project_rates.
--   reads roles and access status from public.user_access
--   (20261106123719_create_user_access_table.sql)
-- special risks: drop policy statements replace the role-wide manager rules with
--   project-scoped ones, so managers lose access to projects outside their area by design.
--   several functions are security definer (see each justification); get_project_people()
--   and get_project_members() return only names, role, positions, account flags and
--   membership pairs, never email, phone, salary or rates.

-- ---------------------------------------------------------------------------
-- projects columns
-- ---------------------------------------------------------------------------

alter table public.projects
  add column links jsonb not null default '[]'::jsonb;

alter table public.projects
  add constraint projects_links_is_array check (jsonb_typeof(links) = 'array');

comment on column public.projects.links is 'ordered list of {label, url} objects shown on the project page';

-- the projects page creates a project from name, client, description and managers only
alter table public.projects
  alter column client set default '';

alter table public.projects
  alter column type set default 'time_material';

-- ---------------------------------------------------------------------------
-- access helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.jwt_role() = 'admin', false);
$$;

comment on function private.is_admin() is 'true when jwt user_role is admin; false when the claim is missing';

-- security definer justification: policies on project_rates and trackers need to know who
-- manages a project, while the projects select policy itself reads project_rates; reading
-- both tables past rls here keeps the policies from recursing into each other.
create or replace function private.is_project_manager(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.manager_id = (select auth.uid())
  )
  or (
    (select private.is_manager_or_admin())
    and exists (
      select 1
      from public.project_rates pr
      where pr.project_id = target_project_id
        and pr.user_id = (select auth.uid())
    )
  );
$$;

comment on function private.is_project_manager(uuid) is
  'true when the caller is responsible for the project, or a manager/admin assigned to it';

-- security definer justification: the projects select policy needs the caller's own
-- membership; reading project_rates past rls avoids recursion with its select policy.
create or replace function private.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_rates pr
    where pr.project_id = target_project_id
      and pr.user_id = (select auth.uid())
  );
$$;

comment on function private.is_project_member(uuid) is 'true when the caller is assigned to the project';

revoke execute on function private.is_admin() from public, anon;
revoke execute on function private.is_project_manager(uuid) from public, anon;
revoke execute on function private.is_project_member(uuid) from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_project_manager(uuid) to authenticated, service_role;
grant execute on function private.is_project_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- responsible person and membership triggers
-- ---------------------------------------------------------------------------

-- runs as the caller: only managers and admins may insert or update projects, and the
-- user_access select policy lets them read every person's role
create or replace function public.validate_project_responsible()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.manager_id is not null and not exists (
    select 1
    from public.user_access ua
    where ua.user_id = new.manager_id
      and ua.role in ('manager', 'admin')
  ) then
    raise exception 'only a manager or an admin can be responsible for a project'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_project_responsible
  before insert or update of manager_id on public.projects
  for each row execute function public.validate_project_responsible();

-- security definer justification: a manager may create a project for another manager or
-- hand theirs over; the responsible person's membership (and a creating manager's, when
-- they name someone else) must be written even though the caller may not manage the
-- project yet. it only ever inserts those (project, person) pairs.
create or replace function public.add_project_manager_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.manager_id is not null then
    insert into public.project_rates (project_id, user_id)
    values (new.id, new.manager_id)
    on conflict (project_id, user_id) do nothing;
  end if;

  if tg_op = 'INSERT'
    and (select private.jwt_role()) = 'manager'
    and (select auth.uid()) is distinct from new.manager_id then
    insert into public.project_rates (project_id, user_id)
    values (new.id, (select auth.uid()))
    on conflict (project_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger add_project_manager_membership
  after insert or update of manager_id on public.projects
  for each row execute function public.add_project_manager_membership();

revoke execute on function public.validate_project_responsible() from public, anon, authenticated;
revoke execute on function public.add_project_manager_membership() from public, anon, authenticated;

-- safety: data-only and additive; makes existing responsible managers members too,
-- with the default rate, and skips pairs that already exist
insert into public.project_rates (project_id, user_id)
select p.id, p.manager_id
from public.projects p
where p.manager_id is not null
on conflict (project_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- projects policies
-- ---------------------------------------------------------------------------

-- safety: replaces the role-wide policies from 20260826113211_replace_managed_project_rls.sql
drop policy if exists "projects_select_visible" on public.projects;
drop policy if exists "projects_insert_management" on public.projects;
drop policy if exists "projects_update_management" on public.projects;
drop policy if exists "projects_delete_management" on public.projects;

-- admins see everything; everyone else sees projects they are responsible for or assigned to
create policy "projects_select_visible"
  on public.projects
  for select
  to authenticated
  using (
    (select private.is_admin())
    or manager_id = (select auth.uid())
    or (select private.is_project_member(id))
  );

-- an admin or manager may name another responsible person when creating a project
create policy "projects_insert_management"
  on public.projects
  for insert
  to authenticated
  with check (
    (select private.is_manager_or_admin())
    and manager_id is not null
  );

-- project managers may hand the project to someone else, but never leave it without a
-- responsible person
create policy "projects_update_management"
  on public.projects
  for update
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(id)))
  )
  with check (
    (select private.is_manager_or_admin())
    and manager_id is not null
  );

create policy "projects_delete_management"
  on public.projects
  for delete
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(id)))
  );

-- ---------------------------------------------------------------------------
-- project_rates policies
-- ---------------------------------------------------------------------------

-- safety: replaces the role-wide project_rates policies (rates were readable by any manager)
drop policy if exists "project_rates_select_visible" on public.project_rates;
drop policy if exists "project_rates_insert_management" on public.project_rates;
drop policy if exists "project_rates_update_management" on public.project_rates;
drop policy if exists "project_rates_delete_management" on public.project_rates;

create policy "project_rates_select_visible"
  on public.project_rates
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  );

create policy "project_rates_insert_management"
  on public.project_rates
  for insert
  to authenticated
  with check (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  );

create policy "project_rates_update_management"
  on public.project_rates
  for update
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  )
  with check (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  );

-- the responsible person always stays a member; a policy (not a trigger) so deleting the
-- project still cascades to every rate
create policy "project_rates_delete_management"
  on public.project_rates
  for delete
  to authenticated
  using (
    (
      (select private.is_admin())
      or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
    )
    and not exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.manager_id = user_id
    )
  );

-- ---------------------------------------------------------------------------
-- trackers policies
-- ---------------------------------------------------------------------------

-- safety: replaces the role-wide tracker policies from 20260826115246_create_trackers_table.sql
drop policy if exists "trackers_select_own_or_management" on public.trackers;
drop policy if exists "trackers_insert_own_or_management" on public.trackers;
drop policy if exists "trackers_update_own_or_management" on public.trackers;
drop policy if exists "trackers_delete_own_or_management" on public.trackers;

-- own entries, plus the team's entries on projects the caller manages
create policy "trackers_select_own_or_management"
  on public.trackers
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  );

-- anyone logs new entries for themselves on projects they manage or are assigned to;
-- project managers and admins may also write others' entries and approval status
create policy "trackers_insert_own_or_management"
  on public.trackers
  for insert
  to authenticated
  with check (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
    or (
      user_id = (select auth.uid())
      and status = 'new'
      and ((select private.is_project_manager(project_id)) or (select private.is_project_member(project_id)))
    )
  );

create policy "trackers_update_own_or_management"
  on public.trackers
  for update
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
    or (user_id = (select auth.uid()) and status = 'new')
  )
  with check (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
    or (
      user_id = (select auth.uid())
      and status = 'new'
      and ((select private.is_project_manager(project_id)) or (select private.is_project_member(project_id)))
    )
  );

create policy "trackers_delete_own_or_management"
  on public.trackers
  for delete
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
    or (user_id = (select auth.uid()) and status = 'new')
  );

-- ---------------------------------------------------------------------------
-- rpc: create, people and members
-- ---------------------------------------------------------------------------

-- creates the project and its extra members in one transaction, so a failure never leaves
-- a project half set up. security invoker: every insert still goes through the projects and
-- project_rates rls policies and the responsible-person validation trigger.
create or replace function public.create_project(
  project_name text,
  responsible_id uuid,
  project_client text default '',
  project_note text default null,
  manager_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_project_id uuid := pg_catalog.gen_random_uuid();
begin
  -- no returning: rls would check visibility of the new row before the trigger has added
  -- a creating manager to the project
  insert into public.projects (id, name, client, note, manager_id)
  values (new_project_id, project_name, coalesce(project_client, ''), project_note, responsible_id);

  -- the responsible person and a creating manager were added by the projects trigger
  insert into public.project_rates (project_id, user_id)
  select new_project_id, manager_id
  from unnest(coalesce(manager_ids, '{}')) as manager_id
  where manager_id is distinct from responsible_id
  on conflict (project_id, user_id) do nothing;

  return new_project_id;
end;
$$;

comment on function public.create_project(text, uuid, text, text, uuid[]) is
  'creates a project with its responsible person and extra members in one transaction';

-- security definer justification: public.users and public.user_access only expose a
-- staff member's own row and project_rates only the caller's own rates, yet project pages
-- must show who manages and works on a project. this returns the minimum profile fields
-- (no email or phone) plus role and access status, for admins/managers everyone, and for
-- everyone else only the people who share a project with the caller.
create or replace function public.get_project_people()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role public.user_role,
  positions jsonb,
  is_confirmed boolean,
  is_blocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible_projects as (
    select p.id, p.manager_id
    from public.projects p
    where p.manager_id = (select auth.uid())
      or exists (
        select 1
        from public.project_rates pr
        where pr.project_id = p.id
          and pr.user_id = (select auth.uid())
      )
  )
  select u.id, u.first_name, u.last_name, ua.role, u.positions, ua.is_confirmed, ua.is_blocked
  from public.users u
  join public.user_access ua on ua.user_id = u.id
  where (select private.is_secure())
    and (select auth.uid()) is not null
    and (
      (select private.is_manager_or_admin())
      or u.id = (select auth.uid())
      or exists (select 1 from visible_projects vp where vp.manager_id = u.id)
      or exists (
        select 1
        from public.project_rates pr
        join visible_projects vp on vp.id = pr.project_id
        where pr.user_id = u.id
      )
    );
$$;

comment on function public.get_project_people() is
  'people visible on project pages: everyone for admins/managers, otherwise people sharing a project with the caller';

-- security definer justification: project_rates rows of other people are hidden from
-- staff because they carry rates; this exposes only (project_id, user_id) pairs for the
-- projects the caller can see, so staff can see who else works on their projects.
create or replace function public.get_project_members()
returns table (
  project_id uuid,
  user_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.project_id, pr.user_id
  from public.project_rates pr
  join public.projects p on p.id = pr.project_id
  where (select private.is_secure())
    and (select auth.uid()) is not null
    and (
      (select private.is_admin())
      or p.manager_id = (select auth.uid())
      or exists (
        select 1
        from public.project_rates own
        where own.project_id = pr.project_id
          and own.user_id = (select auth.uid())
      )
    );
$$;

comment on function public.get_project_members() is
  'project membership pairs (no rates) for the projects visible to the caller';

revoke execute on function public.create_project(text, uuid, text, text, uuid[]) from public, anon;
revoke execute on function public.get_project_people() from public, anon;
revoke execute on function public.get_project_members() from public, anon;
grant execute on function public.create_project(text, uuid, text, text, uuid[]) to authenticated;
grant execute on function public.get_project_people() to authenticated;
grant execute on function public.get_project_members() to authenticated;
