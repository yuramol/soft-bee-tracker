-- migration: grant api roles access
-- purpose: fix 403s from the data api. the private schema and public.users were
--   created without privileges for the api roles: policies calling
--   private.is_secure() failed with "permission denied for schema private", and
--   authenticated had no table grants on public.users at all.
-- affected objects: schema private, function private.is_secure(), table public.users
-- special risks: none — grants only widen access that rls policies still restrict per row

-- policies run as the querying role, so every api role needs to resolve private.is_secure().
-- anon is included on purpose: the restrictive "require secure session" policy goes on every
-- table, so the first anon-readable table would otherwise fail with
-- "permission denied for schema private" (surfacing as an opaque 403 from the data api).
-- usage only allows name resolution — anon still has no select/execute on anything in
-- private except is_secure() below, and postgrest never exposes the private schema.
grant usage on schema private to anon, authenticated, service_role;

grant execute on function private.is_secure() to anon, authenticated, service_role;

-- least privilege: authenticated only reads/updates (rls limits rows to the owner);
-- inserts happen via the security definer signup trigger, deletes via auth.users cascade
grant select, update on table public.users to authenticated;

grant all on table public.users to service_role;
