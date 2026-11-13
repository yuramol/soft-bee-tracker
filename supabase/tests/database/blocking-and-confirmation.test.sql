begin;

select plan(14);

-- seeded users: a01 admin, a02 manager, a03 worker

-- ---------------------------------------------------------------------------
-- token hook
-- ---------------------------------------------------------------------------

select is(
  private.custom_access_token_hook(jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000a03', 'claims', '{}'::jsonb))
    -> 'claims' ->> 'user_role',
  'worker',
  'an active user gets their role on the token'
);

update public.user_access set is_blocked = true
where user_id in ('00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-000000000a01');

select is(
  private.custom_access_token_hook(jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000a03', 'claims', '{}'::jsonb))
    -> 'claims' -> 'user_role',
  'null'::jsonb,
  'a blocked user gets no role on the token'
);

-- ---------------------------------------------------------------------------
-- a blocked worker with a still-valid token
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select is(
  (select count(*)::int from public.users where id = '00000000-0000-0000-0000-000000000a03'),
  1,
  'a blocked user can still read their own profile (the app shows why they were signed out)'
);

select is(
  (select is_blocked from public.user_access where user_id = '00000000-0000-0000-0000-000000000a03'),
  true,
  'a blocked user can read their own access row'
);

select is_empty(
  $$ select id from public.projects $$,
  'a blocked user sees no projects'
);

select is_empty(
  $$ select id from public.trackers $$,
  'a blocked user sees no time entries'
);

select throws_ok(
  $$ update public.users set first_name = 'Blocked' where id = '00000000-0000-0000-0000-000000000a03' $$,
  '42501',
  null,
  'a blocked user cannot edit their own profile'
);

select throws_ok(
  $$ insert into public.trackers (project_id, date, duration_minutes)
     values ('00000000-0000-0000-0000-000000000b01', current_date, 30) $$,
  '42501',
  null,
  'a blocked user cannot log time'
);

-- ---------------------------------------------------------------------------
-- a blocked admin with a still-valid admin token
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

update public.user_access set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000a02';

select is(
  (select count(*)::int from public.users),
  1,
  'a blocked admin only sees their own profile'
);

-- ---------------------------------------------------------------------------
-- an active manager is unaffected
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select ok(
  (select count(*) from public.users) >= 3,
  'an active manager still sees everyone, blocked people included'
);

reset role;

select isnt(
  (select role::text from public.user_access where user_id = '00000000-0000-0000-0000-000000000a02'),
  'admin',
  'a blocked admin cannot change roles'
);

-- ---------------------------------------------------------------------------
-- accepting an invite confirms the account
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000c0f1',
  'authenticated',
  'authenticated',
  'invitee@softbee.test',
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "invitee", "first_name": "In", "last_name": "Vitee"}',
  now(),
  now()
);

select is(
  (select is_confirmed from public.user_access where user_id = '00000000-0000-0000-0000-00000000c0f1'),
  false,
  'an invited user starts unconfirmed'
);

update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000c0f1';

select is(
  (select is_confirmed from public.user_access where user_id = '00000000-0000-0000-0000-00000000c0f1'),
  true,
  'confirming the email (accepting the invite) marks the user confirmed'
);

update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000c0f1';

select is(
  (select is_confirmed from public.user_access where user_id = '00000000-0000-0000-0000-00000000c0f1'),
  true,
  'a later auth update leaves the user confirmed'
);

select * from finish();

rollback;
