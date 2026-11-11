-- migration: scope projects select by user, admins see everything
-- purpose: managers no longer see every project through the jwt role. admin sees
--   all projects; manager sees projects they manage (and any they are assigned to);
--   worker sees only projects they are assigned to via project_rates.
-- affected objects: select policy on public.projects
--   ("projects_select_visible" is replaced by "projects_select_scoped")
-- special risks: drop policy is intentional. managers lose read access to projects
--   managed by others unless they are assigned in project_rates. insert/update/delete
--   policies are unchanged. requires private.jwt_role() from
--   20260826112541_custom_access_token_role_claim.sql; missing claim fails closed.

-- safety: replaces the previous select policy; recreated immediately below
drop policy if exists "projects_select_visible" on public.projects;

-- admin: everything. manager/worker: own managed projects or assigned ones.
-- project_rates is read in a subquery only; its own select policy does not
-- reference public.projects, so there is no policy recursion.
create policy "projects_select_scoped"
  on public.projects
  for select
  to authenticated
  using (
    (select private.jwt_role()) = 'admin'
    or manager_id = (select auth.uid())
    or exists (
      select 1
      from public.project_rates pr
      where pr.project_id = projects.id
        and pr.user_id = (select auth.uid())
    )
  );
