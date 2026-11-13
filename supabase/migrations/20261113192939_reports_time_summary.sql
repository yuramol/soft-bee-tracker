-- migration: reports time summary
-- purpose: back the /reports page with real tracked time instead of mocks. the report
--   needs minutes per (person, project) for a date range; reading raw tracker rows would
--   hit the api max_rows limit (1000) for an admin over a month or more, so the sum is
--   done in the database and only one row per (person, project) comes back.
-- affected objects: function public.get_report_time(date, date)
-- special risks: none. read-only function, security invoker, so the existing
--   trackers rls decides whose time is summed (own entries for staff, entries on the
--   projects a manager manages, everything for admins). no table, policy or grant on a
--   table changes.

-- security invoker: rows pass through the trackers select policy and the restrictive
-- "require secure session" policy of the caller, exactly as a direct select would.
-- rejected entries are not worked time, and a live entry that is still running or
-- paused has no final duration yet, so both are left out.
create or replace function public.get_report_time(from_date date, to_date date)
returns table (
  user_id uuid,
  project_id uuid,
  minutes bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.user_id, t.project_id, sum(t.duration_minutes)::bigint as minutes
  from public.trackers t
  where t.date between from_date and to_date
    and t.status <> 'rejected'
    and not (t.is_live and t.live_status in ('start', 'pause'))
  group by t.user_id, t.project_id
  having sum(t.duration_minutes) > 0;
$$;

comment on function public.get_report_time(date, date) is
  'tracked minutes per person and project in a date range, limited by the caller''s trackers rls';

revoke execute on function public.get_report_time(date, date) from public, anon;
grant execute on function public.get_report_time(date, date) to authenticated;
