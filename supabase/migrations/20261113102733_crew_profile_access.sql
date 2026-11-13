-- migration: crew profile access
-- purpose: let the crew page work on real data. managers and admins can read every
--   profile; admins can edit another person's position and employment date.
-- affected objects: policies "users_select_management" and "users_update_admin_employment"
--   on public.users; function private.guard_users_update(); trigger guard_users_update;
--   column update grant on public.users (positions, date_employment)
-- special risks:
--   - managers and admins (jwt user_role) can read every row of public.users, including
--     email and phone. salary columns no longer exist (dropped in 20261106130942).
--   - admins can update other people's rows, but private.guard_users_update() only lets
--     positions and date_employment change there; names, email and contacts stay owner-only.
--     owners can't change their own positions or date_employment.
--   - grants update (positions, date_employment) to authenticated: sbt-55
--     (20261113081253) limits that role to the profile columns, and admins write these
--     two through it. the guard trigger keeps owners out of them.
--   - role and blocking are not touched here: they live in public.user_access, where
--     admins already have an update policy (20261106123719).
-- ordering: must run after 20261113081253_restrict_user_profile_updates.sql. its
--   "revoke update on table public.users" also drops column-level update grants, so
--   granting here first would be undone.

create policy "users_select_management"
  on public.users
  for select
  to authenticated
  using ((select private.is_manager_or_admin()));

-- admins only, and never their own row through this policy: the owner already has
-- "users can update own profile". the guard trigger limits which columns change.
create policy "users_update_admin_employment"
  on public.users
  for update
  to authenticated
  using (
    (select private.jwt_role()) = 'admin'
    and id <> (select auth.uid())
  )
  with check (
    (select private.jwt_role()) = 'admin'
    and id <> (select auth.uid())
  );

-- rls cannot compare old and new values, so the column limit for admin edits of
-- someone else's row lives in a trigger. comparing whole rows minus the allowed
-- columns also covers columns added later.
-- security invoker: it only reads the caller's jwt and the row being written.
create or replace function private.guard_users_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  editable_by_admin text[] := array['positions', 'date_employment', 'updated_at'];
begin
  -- service role, auth admin and sql sessions have no user; they are trusted
  if caller_id is null then
    return new;
  end if;

  -- position and employment date are set by an admin, never by the person themselves
  -- (the column grant below has to include them for admins, so it can't keep owners out)
  if new.id = caller_id then
    if new.positions is distinct from old.positions or new.date_employment is distinct from old.date_employment then
      raise exception 'position and employment date are set by an admin'
        using errcode = 'insufficient_privilege';
    end if;

    return new;
  end if;

  if (to_jsonb(new) - editable_by_admin) is distinct from (to_jsonb(old) - editable_by_admin) then
    raise exception 'only position and employment date can be changed on another person''s profile'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function private.guard_users_update() is
  'admins may change only positions and date_employment on another profile; owners may not change those two';

grant execute on function private.guard_users_update() to authenticated, service_role;

create trigger guard_users_update
  before update on public.users
  for each row execute function private.guard_users_update();

-- admins write these through the authenticated role, which sbt-55 limits to the
-- profile columns; add the two admin-managed ones (owners are stopped by the trigger)
grant update (positions, date_employment) on table public.users to authenticated;
