-- migration: lock closed tracker months for staff
-- purpose: time for a month can be added, changed or deleted only until 23:59 (utc+2,
--   the company time zone) on the 5th of the next month. the app already applied this
--   rule (src/lib/work-time-policy.ts), but only in the ui, so the data api still
--   accepted writes for closed months. this enforces it in the database for staff.
--   managers and admins may still correct closed months, which also keeps approving or
--   rejecting entries after the deadline possible.
-- affected objects: functions private.is_tracker_date_open(date, timestamptz),
--   private.guard_tracker_closed_month(); trigger guard_tracker_closed_month on
--   public.trackers
-- special risks:
--   - staff writes to closed months now fail. a live timer still running or paused in a
--     closed month is the exception: its owner may pause, resume or discard it, and may
--     finish it only into an open month.
--   - no data changes; existing entries stay as they are. no table policy or table grant
--     changes (only execute grants on the two new functions).

-- open until 00:00 on the 6th of the next month in utc+2, i.e. through 23:59:59 on the 5th.
-- 'etc/gmt-2' is fixed utc+2 (posix sign is inverted), matching COMPANY_TIME_ZONE in the app.
-- check_time defaults to now(); tests pass fixed moments to check the boundary.
create or replace function private.is_tracker_date_open(entry_date date, check_time timestamptz default pg_catalog.now())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select check_time
    < ((pg_catalog.date_trunc('month', entry_date::timestamp) + interval '1 month 5 days') at time zone 'Etc/GMT-2');
$$;

comment on function private.is_tracker_date_open(date, timestamptz) is
  'true until 23:59:59 utc+2 on the 5th of the month after entry_date';

-- a trigger rather than rls: an update must check both the old and the new date, so an
-- entry can neither be moved out of nor into a closed month.
-- security invoker: it only reads the caller's jwt and the row being written.
create or replace function private.guard_tracker_closed_month()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- service role and sql sessions have no user; they are trusted.
  -- managers and admins may correct closed months.
  if (select auth.uid()) is null or (select private.is_manager_or_admin()) then
    return coalesce(new, old);
  end if;

  -- a timer still running or paused is not logged time yet. its owner may discard it, pause
  -- or resume it in place, or finish it into an open month, so it never gets stuck
  if old.is_live and old.live_status in ('start', 'pause') and old.user_id = (select auth.uid()) then
    if tg_op = 'DELETE'
      or private.is_tracker_date_open(new.date)
      or (new.is_live and new.live_status in ('start', 'pause') and new.date = old.date) then
      return coalesce(new, old);
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and not private.is_tracker_date_open(old.date) then
    raise exception 'Time for this month is closed and can no longer be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op in ('INSERT', 'UPDATE') and not private.is_tracker_date_open(new.date) then
    raise exception 'Time for this month is closed and can no longer be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce(new, old);
end;
$$;

comment on function private.guard_tracker_closed_month() is
  'before write trigger: staff cannot write tracker entries after the month''s edit deadline';

revoke execute on function private.is_tracker_date_open(date, timestamptz) from public, anon;
revoke execute on function private.guard_tracker_closed_month() from public, anon, authenticated;
grant execute on function private.is_tracker_date_open(date, timestamptz) to authenticated;

create trigger guard_tracker_closed_month
  before insert or update or delete on public.trackers
  for each row execute function private.guard_tracker_closed_month();
