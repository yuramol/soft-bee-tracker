-- migration: users time zone
-- purpose: let each user store their own iana time zone (e.g. 'Europe/Kyiv');
--   the profile spec has the owner edit name, photo and time zone.
-- affected objects: column public.users.time_zone
-- special risks: none. the alter is additive (nullable column, no default, no table
--   rewrite); existing rows stay null and the app falls back to the device time zone.
--   no grant or policy change: authenticated already has table-level update on
--   public.users and the "users can update own profile" policy limits it to the own row.

-- safety: additive alter only — nothing is dropped or rewritten
alter table public.users
  add column time_zone text
  constraint users_time_zone_length check (time_zone is null or char_length(time_zone) between 1 and 64);

comment on column public.users.time_zone is 'iana time zone chosen by the user; null means use the device time zone';
