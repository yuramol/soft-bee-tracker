begin;

select plan(19);

-- the deadline: 23:59:59 utc+2 (21:59:59 utc) on the 5th of the next month
select ok(
  private.is_tracker_date_open('2026-11-30', '2026-12-05 21:59:59+00'),
  'last month stays open through 23:59:59 utc+2 on the 5th'
);

select ok(
  not private.is_tracker_date_open('2026-11-30', '2026-12-05 22:00:00+00'),
  'last month closes at 00:00 utc+2 on the 6th'
);

select ok(
  private.is_tracker_date_open('2026-12-31', '2027-01-05 21:59:59+00'),
  'december stays open until 5 january of the next year'
);

select ok(
  not private.is_tracker_date_open('2026-10-31', '2026-12-01 10:00:00+00'),
  'older months are closed'
);

-- seeded: admin a01, manager a02 (responsible for b01), worker a03 (assigned to b01).
-- one entry in a closed month and one in the current month, written as a trusted session
create temp table closed_entry on commit drop as
select (pg_catalog.date_trunc('month', current_date) - interval '3 months')::date as day;

insert into public.trackers (id, date, duration_minutes, project_id, user_id)
values
  ('00000000-0000-0000-0000-00000000dc01', (select day from closed_entry), 60,
   '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000dc02', current_date, 60,
   '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03');

-- paused live timers the worker forgot until their month closed
insert into public.trackers (id, date, duration_minutes, is_live, live_status, live_duration_minutes, project_id, user_id)
values
  ('00000000-0000-0000-0000-00000000dc03', (select day from closed_entry), 0, true, 'pause', 30,
   '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000dc04', (select day from closed_entry), 0, true, 'pause', 30,
   '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03');

select is(
  (select count(*)::int from public.trackers where id = '00000000-0000-0000-0000-00000000dc01'),
  1,
  'sessions without a user (service role, sql) can still write closed months'
);

grant select on closed_entry to authenticated;

set local role authenticated;

-- staff
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select throws_ok(
  $$insert into public.trackers (date, duration_minutes, project_id)
    values ((select day from closed_entry), 30, '00000000-0000-0000-0000-000000000b01')$$,
  '42501',
  'Time for this month is closed and can no longer be changed.',
  'staff cannot add time to a closed month'
);

select lives_ok(
  $$insert into public.trackers (date, duration_minutes, project_id)
    values (current_date, 30, '00000000-0000-0000-0000-000000000b01')$$,
  'staff can add time to an open month'
);

select throws_ok(
  $$update public.trackers set duration_minutes = 90 where id = '00000000-0000-0000-0000-00000000dc01'$$,
  '42501',
  null,
  'staff cannot change an entry in a closed month'
);

select throws_ok(
  $$update public.trackers set date = (select day from closed_entry) where id = '00000000-0000-0000-0000-00000000dc02'$$,
  '42501',
  null,
  'staff cannot move an entry into a closed month'
);

select throws_ok(
  $$delete from public.trackers where id = '00000000-0000-0000-0000-00000000dc01'$$,
  '42501',
  null,
  'staff cannot delete an entry in a closed month'
);

select lives_ok(
  $$update public.trackers set duration_minutes = 75 where id = '00000000-0000-0000-0000-00000000dc02'$$,
  'staff can still change an entry in an open month'
);

select lives_ok(
  $$update public.trackers set live_status = 'start', start_live_date = now() where id = '00000000-0000-0000-0000-00000000dc03'$$,
  'staff can resume a live timer left in a closed month'
);

select throws_ok(
  $$update public.trackers set is_live = true, live_status = 'finish', duration_minutes = 30
    where id = '00000000-0000-0000-0000-00000000dc03'$$,
  '42501',
  null,
  'staff cannot finish a live timer into a closed month'
);

select lives_ok(
  $$update public.trackers set live_status = 'finish', date = current_date, duration_minutes = 30
    where id = '00000000-0000-0000-0000-00000000dc03'$$,
  'staff can finish a live timer from a closed month into an open month'
);

select lives_ok(
  $$delete from public.trackers where id = '00000000-0000-0000-0000-00000000dc04'$$,
  'staff can discard a live timer left in a closed month'
);

select is(
  (select count(*)::int from public.trackers where id = '00000000-0000-0000-0000-00000000dc04'),
  0,
  'the discarded timer is gone'
);

-- manager of the project: may correct and review closed months
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select lives_ok(
  $$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000dc01'$$,
  'a manager can approve an entry in a closed month'
);

select lives_ok(
  $$update public.trackers set duration_minutes = 45 where id = '00000000-0000-0000-0000-00000000dc01'$$,
  'a manager can correct an entry in a closed month'
);

-- admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select lives_ok(
  $$insert into public.trackers (date, duration_minutes, project_id, user_id)
    values ((select day from closed_entry), 15, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03')$$,
  'an admin can add time to a closed month'
);

select * from finish();

rollback;
