begin;

select plan(19);

select hasnt_column('public', 'users', 'role', 'public.users has no role column');
select hasnt_column('public', 'users', 'is_confirmed', 'public.users has no is_confirmed column');
select hasnt_column('public', 'users', 'is_blocked', 'public.users has no is_blocked column');

select fk_ok(
  'public', 'user_access', 'user_id',
  'public', 'users', 'id',
  'user_access.user_id references users.id'
);

select isnt_definer('public', 'handle_new_user', 'handle_new_user is security invoker');
select isnt_definer('private', 'custom_access_token_hook', 'custom_access_token_hook is security invoker');
select hasnt_function('public', 'custom_access_token_hook', 'hook is not exposed in public');

set local role supabase_auth_admin;

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000f001',
  'authenticated',
  'authenticated',
  'new-member@softbee.dev',
  '{"username": "newbie", "first_name": "New", "last_name": "Member", "role": "admin", "is_blocked": false}'
);

select set_config(
  'test.hook_role',
  private.custom_access_token_hook(
    jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000a01', 'claims', '{}'::jsonb)
  ) -> 'claims' ->> 'user_role',
  true
);

reset role;

select results_eq(
  $$ select role::text, is_confirmed, is_blocked
     from public.user_access
     where user_id = '00000000-0000-0000-0000-00000000f001' $$,
  $$ values ('worker', false, false) $$,
  'signup creates a worker access row and ignores role from client metadata'
);

select is(
  current_setting('test.hook_role'),
  'admin',
  'custom_access_token_hook puts the user_access role on the jwt'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000a03", "role": "authenticated", "user_role": "worker"}',
  true
);

select results_eq(
  $$ select user_id from public.user_access $$,
  $$ values ('00000000-0000-0000-0000-000000000a03'::uuid) $$,
  'worker sees only their own access row'
);

update public.user_access set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000a03';

select throws_ok(
  $$ insert into public.user_access (user_id) values ('00000000-0000-0000-0000-000000000a03') $$,
  '42501',
  null,
  'authenticated cannot insert access rows'
);

select throws_ok(
  $$ delete from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03' $$,
  '42501',
  null,
  'authenticated cannot delete access rows'
);

update public.users set first_name = 'Walter' where id = '00000000-0000-0000-0000-000000000a03';

reset role;

select is(
  (select role::text from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03'),
  'worker',
  'worker cannot promote themselves'
);

select is(
  (select first_name from public.users where id = '00000000-0000-0000-0000-000000000a03'),
  'Walter',
  'worker can still edit their own profile fields'
);

select set_config('test.access_rows', (select count(*)::text from public.user_access), true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000a02", "role": "authenticated", "user_role": "manager"}',
  true
);

select is(
  (select count(*)::int from public.user_access),
  current_setting('test.access_rows')::int,
  'manager sees every access row'
);

update public.user_access set is_blocked = true where user_id = '00000000-0000-0000-0000-000000000a03';

select set_config(
  'request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000a01", "role": "authenticated", "user_role": "admin"}',
  true
);

update public.user_access set role = 'manager' where user_id = '00000000-0000-0000-0000-000000000a03';

update public.user_access set is_blocked = true where user_id = '00000000-0000-0000-0000-000000000a01';

select throws_ok(
  $$ update public.user_access set user_id = '00000000-0000-0000-0000-00000000f001'
     where user_id = '00000000-0000-0000-0000-000000000a03' $$,
  '42501',
  null,
  'user_id is not updatable by api roles'
);

reset role;

select is(
  (select is_blocked from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03'),
  false,
  'manager cannot block a member'
);

select is(
  (select role::text from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03'),
  'manager',
  'admin can change another member''s role'
);

select is(
  (select is_blocked from public.user_access where user_id = '00000000-0000-0000-0000-000000000a01'),
  false,
  'admin cannot change their own access row'
);

select * from finish();

rollback;
