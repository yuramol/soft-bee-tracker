begin;

select plan(13);

-- seeded users: a01 admin, a02 manager, a03 worker
set local role authenticated;

-- worker
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select is(
  (select array_agg(id) from public.users),
  array['00000000-0000-0000-0000-000000000a03'::uuid],
  'a worker only sees their own profile'
);

select lives_ok(
  $$ update public.users set first_name = 'Wim' where id = '00000000-0000-0000-0000-000000000a03' $$,
  'a worker can still edit their own profile'
);

select throws_ok(
  $$ update public.users set positions = '{"titles": ["CTO"]}' where id = '00000000-0000-0000-0000-000000000a03' $$,
  '42501',
  'position and employment date are set by an admin',
  'a worker cannot set their own position'
);

-- manager
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select ok(
  (select count(*) from public.users where id in (
    '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000a03'
  )) = 3,
  'a manager sees every profile'
);

update public.users set positions = '{"titles": ["Hacked"]}' where id = '00000000-0000-0000-0000-000000000a03';
update public.user_access set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000a03';

select lives_ok(
  $$ insert into public.leave_allowances (user_id, year, leave_type, days)
     values ('00000000-0000-0000-0000-000000000a03', 2031, 'vacation', 22) $$,
  'a manager can set someone''s allowance'
);

-- admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select isnt(
  (select positions::text from public.users where id = '00000000-0000-0000-0000-000000000a03'),
  '{"titles": ["Hacked"]}',
  'a manager cannot change someone''s position'
);

select is(
  (select role::text from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03'),
  'worker',
  'a manager cannot change someone''s role'
);

select lives_ok(
  $$ update public.users set positions = '{"titles": ["Staff engineer"]}', date_employment = '2023-09-11'
     where id = '00000000-0000-0000-0000-000000000a03' $$,
  'an admin can edit someone''s position and start date'
);

select is(
  (select positions->'titles'->>0 from public.users where id = '00000000-0000-0000-0000-000000000a03'),
  'Staff engineer',
  'the position change is saved'
);

select throws_ok(
  $$ update public.users set email = 'taken@softbee.dev' where id = '00000000-0000-0000-0000-000000000a03' $$,
  '42501',
  -- refused by the column grant (sbt-55) before the guard trigger runs; either is fine
  null,
  'an admin cannot change someone else''s email'
);

select lives_ok(
  $$ update public.user_access set is_blocked = true where user_id = '00000000-0000-0000-0000-000000000a03' $$,
  'an admin can block someone'
);

update public.user_access set is_blocked = true where user_id = '00000000-0000-0000-0000-000000000a01';

select is(
  (select is_blocked from public.user_access where user_id = '00000000-0000-0000-0000-000000000a01'),
  false,
  'an admin cannot block themselves'
);

-- anonymous visitors
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  $$ select id from public.users $$,
  'anon sees no profiles'
);

select * from finish();

rollback;
