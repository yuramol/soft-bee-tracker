-- migration: replace narrow managed-project rls with role/assignment-aware policies
-- purpose: environments that applied 20260820120000_allow_managed_project_access.sql
--   keep its permissive "managed only" policies. drop those, then add fuller
--   projects/project_rates access. elevated checks use private.is_manager_or_admin()
--   (jwt user_role from custom_access_token_hook) instead of querying public.users.
-- affected objects: policies and grants on public.projects, public.project_rates;
--   index public.projects_status_idx
-- special risks: drop policy is intentional — replaces the pr #12 managed-only rules.
--   requires 20260826112541_custom_access_token_role_claim.sql and the auth hook enabled.

-- safety: remove the narrow managed-only policies from the prior migration
drop policy if exists "users can view managed projects" on public.projects;
drop policy if exists "users can create managed projects" on public.projects;

create index if not exists projects_status_idx on public.projects (status);

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_rates to authenticated;

-- select: project manager, admin/manager jwt role, or assigned via project_rates
create policy "projects_select_visible"
  on public.projects
  for select
  to authenticated
  using (
    manager_id = (select auth.uid())
    or (select private.is_manager_or_admin())
    or exists (
      select 1
      from public.project_rates pr
      where pr.project_id = projects.id
        and pr.user_id = (select auth.uid())
    )
  );

-- create requires management jwt role; app sets manager_id to the signed-in user
create policy "projects_insert_management"
  on public.projects
  for insert
  to authenticated
  with check (
    (select private.is_manager_or_admin())
    and manager_id = (select auth.uid())
  );

create policy "projects_update_management"
  on public.projects
  for update
  to authenticated
  using ((select private.is_manager_or_admin()))
  with check ((select private.is_manager_or_admin()));

create policy "projects_delete_management"
  on public.projects
  for delete
  to authenticated
  using ((select private.is_manager_or_admin()));

-- deliberately does not join public.projects: the projects select policy already
-- reads this table, and a reference back would make the two policies mutually
-- recursive (postgres raises "infinite recursion detected in policy").
create policy "project_rates_select_visible"
  on public.project_rates
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_manager_or_admin())
  );

create policy "project_rates_insert_management"
  on public.project_rates
  for insert
  to authenticated
  with check ((select private.is_manager_or_admin()));

create policy "project_rates_update_management"
  on public.project_rates
  for update
  to authenticated
  using ((select private.is_manager_or_admin()))
  with check ((select private.is_manager_or_admin()));

create policy "project_rates_delete_management"
  on public.project_rates
  for delete
  to authenticated
  using ((select private.is_manager_or_admin()));
