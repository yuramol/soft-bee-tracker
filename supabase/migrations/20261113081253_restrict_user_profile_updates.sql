-- migration: restrict user profile updates to profile columns
-- purpose: limit what the api roles can write on public.users (SBT-55).
--   role, is_confirmed and is_blocked moved to public.user_access in
--   20261106123719 (SBT-8), where only admins may update them, so the role
--   escalation this task first closed here is already gone. what remains: the
--   table-wide update grant still lets any signed-in user rewrite their own
--   email (which never syncs back to auth.users), position or employment date,
--   none of which the profile page offers.
-- affected objects: table public.users (privileges of roles authenticated and anon)
-- special risks: revokes privileges. a client update of a column outside the
--   list below now fails with "permission denied". the app only writes these
--   columns (mapProfileUpdateToUserRow, mapAvatarUpdateToUserRow); the signup
--   trigger, supabase_auth_admin and service_role are unaffected. a later
--   feature that lets admins edit position or employment date through the api
--   must grant those columns explicitly.
-- ordering: runs after 20261110190000_add_users_time_zone.sql, because the
--   column grant names time_zone.

-- safety: revoke only removes the table-wide update right of authenticated.
-- select stays, rls still limits updates to the owner's row, and service_role
-- keeps "grant all".
revoke update on table public.users from authenticated;

-- column-level grant: exactly the fields a user edits on their own profile.
-- updated_at is left out on purpose: public.trigger_set_updated_at sets it in a
-- before-update trigger, and column privileges only check the update's set list.
grant update (username, first_name, last_name, phone, avatar_url, linkedin, upwork, time_zone)
  on table public.users
  to authenticated;

-- defense in depth: supabase's default privileges gave anon and authenticated
-- every right on this table, so until now rls alone stopped these writes
-- (no insert/delete policies for them; the update policy is authenticated-only).
-- safety: rows are created by the signup trigger and removed by the auth.users
-- cascade, both outside these roles, and the app never inserts, deletes or
-- truncates here through the api. anon keeps select, still filtered by rls.
revoke insert, update, delete, truncate, references, trigger on table public.users from anon;
revoke insert, delete, truncate, references, trigger on table public.users from authenticated;
