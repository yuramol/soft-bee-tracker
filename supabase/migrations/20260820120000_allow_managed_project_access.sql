-- Authenticated users may create and read projects they manage. The existing
-- restrictive secure-session policy still applies to every request.

grant select, insert on table public.projects to authenticated;

create policy "users can view managed projects"
  on public.projects
  for select
  to authenticated
  using ((select auth.uid()) = manager_id);

create policy "users can create managed projects"
  on public.projects
  for insert
  to authenticated
  with check ((select auth.uid()) = manager_id);
