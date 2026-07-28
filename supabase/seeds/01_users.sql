-- seed: local development users, one per role
-- password for all three: Password1
--   admin@softbee.dev   -> admin
--   manager@softbee.dev -> manager
--   worker@softbee.dev  -> worker
-- inserting into auth.users fires public.handle_new_user, which creates the
-- public.users profile with role 'worker'; roles are promoted afterwards the
-- same way an admin would do it in production.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000a01',
    'authenticated',
    'authenticated',
    'admin@softbee.dev',
    extensions.crypt('Password1', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "admin", "first_name": "Ada", "last_name": "Adminson"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000a02',
    'authenticated',
    'authenticated',
    'manager@softbee.dev',
    extensions.crypt('Password11', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "manager", "first_name": "Mila", "last_name": "Managerova"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000a03',
    'authenticated',
    'authenticated',
    'worker@softbee.dev',
    extensions.crypt('Password1', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "worker", "first_name": "Wim", "last_name": "Workerman"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- email identities are required for password sign-in with recent gotrue versions
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  extensions.gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email in ('admin@softbee.dev', 'manager@softbee.dev', 'worker@softbee.dev');

-- promote roles and confirm profiles (signup trigger always creates 'worker')
update public.users set role = 'admin', is_confirmed = true where email = 'admin@softbee.dev';

update public.users set role = 'manager', is_confirmed = true where email = 'manager@softbee.dev';

update public.users set role = 'worker', is_confirmed = true where email = 'worker@softbee.dev';
