begin;

select plan(2);

select results_eq(
  $$ select u.email::text, ua.role::text, ua.is_confirmed
     from public.users u
     join public.user_access ua on ua.user_id = u.id
     where u.email like '%@softbee.dev'
     order by u.email $$,
  $$ values
       ('admin@softbee.dev', 'admin', true),
       ('manager@softbee.dev', 'manager', true),
       ('worker@softbee.dev', 'worker', true) $$,
  'seeds create confirmed admin, manager and worker test accounts'
);

select is(
  (select count(*)::int from auth.identities where provider = 'email' and user_id in (
    select id from public.users where email like '%@softbee.dev'
  )),
  3,
  'each seeded test account has an email identity'
);

select * from finish();

rollback;
