-- migration: default trackers.user_id from jwt
-- purpose: set public.trackers.user_id default to auth.uid() so clients do not
--   need to resolve the current user before insert; identity comes from the jwt.
-- affected objects: public.trackers.user_id column default
-- special risks: none — existing rows unchanged; explicit user_id on insert still
--   allowed (e.g. managers creating entries for others) and remains subject to rls.

alter table public.trackers
  alter column user_id set default auth.uid();
