begin;

select plan(2);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000e001', 'before@sync.test', '{"username": "email-sync-test"}');

update auth.users
set email = 'after@sync.test'
where id = '00000000-0000-0000-0000-00000000e001';

select is(
  (select email from public.users where id = '00000000-0000-0000-0000-00000000e001'),
  'after@sync.test',
  'a confirmed auth email change is copied to the profile'
);

update auth.users
set email_change = 'pending@sync.test'
where id = '00000000-0000-0000-0000-00000000e001';

select is(
  (select email from public.users where id = '00000000-0000-0000-0000-00000000e001'),
  'after@sync.test',
  'a pending email change leaves the profile email untouched'
);

select * from finish();

rollback;
