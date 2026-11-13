begin;

select plan(20);

-- seeded users: a01 admin, a02 manager, a03 worker. dates are in 2030 so they
-- never collide with the seeded requests; 2030-03-04 is a monday.

-- act as the worker
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select lives_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date, note)
     values ('vacation', '2030-03-04', '2030-03-08', 'spring break') $$,
  'a worker can request leave for themselves'
);

select is(
  (select status::text from public.leave_requests where start_date = '2030-03-04' and user_id = '00000000-0000-0000-0000-000000000a03'),
  'pending',
  'a new request starts pending'
);

select throws_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date) values ('sick_leave', '2030-03-06', '2030-03-11') $$,
  '23P01',
  null,
  'a request overlapping an open request is rejected'
);

select throws_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date) values ('vacation', '2030-03-09', '2030-03-10') $$,
  '23514',
  'leave must include at least one working day',
  'a weekend-only request is rejected'
);

select throws_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date, status) values ('vacation', '2030-04-01', '2030-04-01', 'approved') $$,
  '42501',
  null,
  'a worker cannot create an approved request'
);

select throws_ok(
  $$ insert into public.leave_requests (user_id, leave_type, start_date, end_date)
     values ('00000000-0000-0000-0000-000000000a02', 'vacation', '2030-04-01', '2030-04-01') $$,
  '42501',
  null,
  'a worker cannot request leave for someone else'
);

select throws_ok(
  $$ update public.leave_requests set status = 'approved' where start_date = '2030-03-04' $$,
  '42501',
  null,
  'a worker cannot approve their own request'
);

select throws_ok(
  $$ update public.leave_requests set end_date = '2030-03-05' where start_date = '2030-03-04' $$,
  '42501',
  null,
  'a worker cannot edit the dates of a submitted request'
);

select throws_ok(
  $$ insert into public.leave_allowances (user_id, year, leave_type, days)
     values ('00000000-0000-0000-0000-000000000a03', 2030, 'vacation', 99) $$,
  '42501',
  null,
  'a worker cannot set their own allowance'
);

select lives_ok(
  $$ update public.leave_requests set status = 'cancelled' where start_date = '2030-03-04' $$,
  'a worker can cancel their own pending request'
);

select lives_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date) values ('vacation', '2030-03-04', '2030-03-05') $$,
  'cancelled dates can be requested again'
);

-- act as the manager
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select lives_ok(
  $$ insert into public.leave_requests (leave_type, start_date, end_date) values ('vacation', '2030-05-06', '2030-05-07') $$,
  'a manager can request their own leave'
);

select lives_ok(
  $$ update public.leave_requests set status = 'approved'
     where start_date = '2030-03-04' and status = 'pending' $$,
  'a manager can approve a worker request'
);

select is(
  (select decided_by from public.leave_requests where start_date = '2030-03-04' and status = 'approved'),
  '00000000-0000-0000-0000-000000000a02'::uuid,
  'the approval records who decided'
);

select throws_ok(
  $$ update public.leave_requests set status = 'rejected' where start_date = '2030-03-04' and status = 'approved' $$,
  '23514',
  'a approved request cannot become rejected',
  'an approved request cannot be rejected afterwards'
);

select throws_ok(
  $$ update public.leave_requests set status = 'approved' where start_date = '2030-05-06' $$,
  '42501',
  'only an admin can decide on their own leave',
  'a manager cannot approve their own request'
);

-- back to the worker
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select is(
  (select count(*)::int from public.leave_requests where user_id = '00000000-0000-0000-0000-000000000a02'),
  0,
  'a worker cannot see other people''s requests'
);

update public.leave_requests set status = 'cancelled' where start_date = '2030-03-04' and status = 'approved';

select is(
  (select status::text from public.leave_requests where start_date = '2030-03-04' and status <> 'cancelled'),
  'approved',
  'a worker cannot cancel an approved request'
);

-- act as the admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select lives_ok(
  $$ update public.leave_requests set status = 'approved' where start_date = '2030-05-06' $$,
  'an admin can approve a manager request'
);

-- anonymous visitors
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select count(*) from public.leave_requests $$,
  '42501',
  null,
  'anon cannot read leave requests'
);

select * from finish();

rollback;
