begin;

select plan(8);

-- seeded: admin a01, manager a02 (responsible for b01–b03), worker a03 (assigned to b01–b03).
-- a second manager runs a project of their own that the worker is also on.
-- dates sit in 2001 so time logged in the local database never mixes in.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000e002', 'manager2@report.test', '{"username": "report-manager-two"}');

update public.user_access set role = 'manager' where user_id = '00000000-0000-0000-0000-00000000e002';

insert into public.projects (id, name, manager_id)
values ('00000000-0000-0000-0000-00000000ec01', 'Report other project', '00000000-0000-0000-0000-00000000e002');

insert into public.project_rates (project_id, user_id)
values ('00000000-0000-0000-0000-00000000ec01', '00000000-0000-0000-0000-000000000a03');

insert into public.trackers (date, duration_minutes, status, is_live, live_status, project_id, user_id)
values
  ('2001-01-02', 120, 'new', false, null, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-01-03', 60, 'approved', false, null, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-01-03', 30, 'new', true, 'finish', '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  -- not worked time: rejected, still running, outside the range
  ('2001-01-03', 500, 'rejected', false, null, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-01-04', 700, 'new', true, 'pause', '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-02-01', 900, 'new', false, null, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-01-02', 45, 'new', false, null, '00000000-0000-0000-0000-00000000ec01', '00000000-0000-0000-0000-000000000a03'),
  ('2001-01-02', 90, 'new', false, null, '00000000-0000-0000-0000-00000000ec01', '00000000-0000-0000-0000-00000000e002');

set local role authenticated;

-- staff: only their own time, on every project they log to
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select is(
  (select minutes::int from public.get_report_time('2001-01-01', '2001-01-31')
   where project_id = '00000000-0000-0000-0000-000000000b01'),
  210,
  'sums new, approved and finished live time; skips rejected, running and out-of-range entries'
);

select is(
  (select array_agg(distinct user_id)::text from public.get_report_time('2001-01-01', '2001-01-31')),
  '{00000000-0000-0000-0000-000000000a03}',
  'staff see only their own time'
);

select is(
  (select sum(minutes)::int from public.get_report_time('2001-01-01', '2001-01-31')),
  255,
  'staff see their time on every project they are assigned to'
);

-- manager: the team's time on projects they manage, never on someone else's project
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select is(
  (select minutes::int from public.get_report_time('2001-01-01', '2001-01-31')
   where project_id = '00000000-0000-0000-0000-000000000b01' and user_id = '00000000-0000-0000-0000-000000000a03'),
  210,
  'a manager sees staff time on the projects they manage'
);

select is(
  (select count(*)::int from public.get_report_time('2001-01-01', '2001-01-31')
   where project_id = '00000000-0000-0000-0000-00000000ec01'),
  0,
  'a manager does not see time on projects they do not manage'
);

-- admin: everything
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select is(
  (select sum(minutes)::int from public.get_report_time('2001-01-01', '2001-01-31')
   where project_id = '00000000-0000-0000-0000-00000000ec01'),
  135,
  'an admin sees everyone''s time on every project'
);

select is(
  (select count(*)::int from public.get_report_time('2001-03-01', '2001-03-31')),
  0,
  'a range without entries returns no rows'
);

reset role;

select ok(
  not has_function_privilege('anon', 'public.get_report_time(date, date)', 'execute'),
  'anon cannot call get_report_time'
);

select * from finish();

rollback;
