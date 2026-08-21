-- migration: allow authenticated projects read
-- purpose: let signed-in users load projects for tracker creation.
-- affected objects: select policy and authenticated grant on public.projects
-- special risks: every authenticated user may read every project row.

create policy "authenticated users can view projects"
  on public.projects
  for select
  to authenticated
  using (true);

grant select on table public.projects to authenticated;
