-- seed: extra local people so the crew page has something to show
-- emails use softbee.example (not softbee.dev) so the seed-users test still sees
-- exactly the three sign-in accounts. password for all: Password1
--   iryna@softbee.example  -> worker, active, on Website Redesign and Mobile App
--   taras@softbee.example  -> worker, invited but not signed in yet (pending)
--   sofiia@softbee.example -> worker, blocked
-- also: positions and start dates for every seeded person, project assignments,
-- time entries this week and month, and leave that overlaps on a shared project.

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
select
  '00000000-0000-0000-0000-000000000000',
  person.id,
  'authenticated',
  'authenticated',
  person.email,
  extensions.crypt('Password1', extensions.gen_salt('bf')),
  -- an invite that hasn't been accepted has no confirmed email yet
  case when person.email = 'taras@softbee.example' then null else now() end,
  '{"provider": "email", "providers": ["email"]}',
  person.meta,
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('00000000-0000-0000-0000-000000000a04'::uuid, 'iryna@softbee.example', '{"username": "iryna", "first_name": "Iryna", "last_name": "Shevchenko"}'::jsonb),
    ('00000000-0000-0000-0000-000000000a05'::uuid, 'taras@softbee.example', '{"username": "taras", "first_name": "Taras", "last_name": "Bondar"}'::jsonb),
    ('00000000-0000-0000-0000-000000000a06'::uuid, 'sofiia@softbee.example', '{"username": "sofiia", "first_name": "Sofiia", "last_name": "Tkachenko"}'::jsonb)
) as person (id, email, meta);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
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
where u.email like '%@softbee.example';

-- the signup trigger creates every profile as an unconfirmed worker
update public.user_access set is_confirmed = true
where user_id in ('00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000a06');

update public.user_access set is_blocked = true
where user_id = '00000000-0000-0000-0000-000000000a06';

update public.users u
set positions = jsonb_build_object('titles', jsonb_build_array(profile.position)),
    date_employment = profile.employed_since
from (
  values
    ('00000000-0000-0000-0000-000000000a01'::uuid, 'Delivery lead', '2021-03-01'::date),
    ('00000000-0000-0000-0000-000000000a02'::uuid, 'Project manager', '2022-06-15'::date),
    ('00000000-0000-0000-0000-000000000a03'::uuid, 'Backend engineer', '2023-09-11'::date),
    ('00000000-0000-0000-0000-000000000a04'::uuid, 'Frontend engineer', '2023-02-01'::date),
    ('00000000-0000-0000-0000-000000000a05'::uuid, 'Frontend engineer', null::date),
    ('00000000-0000-0000-0000-000000000a06'::uuid, 'QA engineer', '2024-01-08'::date)
) as profile (id, position, employed_since)
where u.id = profile.id;

insert into public.project_rates (project_id, user_id, rate)
values
  ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a04', 40.00),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000a04', 40.00),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000a05', 35.00)
on conflict (project_id, user_id) do update
set rate = excluded.rate;

-- approved time entries on the last few days (never in the future), so this week
-- and this month both have totals
insert into public.trackers (user_id, project_id, date, description, duration_minutes, status)
select entry.user_id, entry.project_id, greatest(current_date - entry.days_ago, date_trunc('month', current_date)::date), entry.description, entry.minutes, 'approved'
from (
  values
    ('00000000-0000-0000-0000-000000000a03'::uuid, '00000000-0000-0000-0000-000000000b01'::uuid, 0, 'API review', 240),
    ('00000000-0000-0000-0000-000000000a03'::uuid, '00000000-0000-0000-0000-000000000b02'::uuid, 1, 'Push notifications', 300),
    ('00000000-0000-0000-0000-000000000a04'::uuid, '00000000-0000-0000-0000-000000000b01'::uuid, 0, 'Checkout layout', 360),
    ('00000000-0000-0000-0000-000000000a04'::uuid, '00000000-0000-0000-0000-000000000b02'::uuid, 2, 'Onboarding screens', 180),
    ('00000000-0000-0000-0000-000000000a04'::uuid, '00000000-0000-0000-0000-000000000b01'::uuid, 9, 'Design review fixes', 420)
) as entry (user_id, project_id, days_ago, description, minutes);

-- overlaps the worker's pending december vacation on Website Redesign and Mobile App,
-- so the leave tab shows a coverage warning
insert into public.leave_requests (user_id, leave_type, start_date, end_date, note, status)
values (
  '00000000-0000-0000-0000-000000000a04',
  'vacation',
  date_trunc('week', current_date + 28)::date + 2,
  date_trunc('week', current_date + 28)::date + 4,
  'Visiting family.',
  'pending'
);

insert into public.leave_allowances (user_id, year, leave_type, days)
select '00000000-0000-0000-0000-000000000a04', extract(year from current_date)::smallint, allowance.leave_type, allowance.days
from (values ('vacation'::public.leave_type, 20), ('sick_leave'::public.leave_type, 10)) as allowance (leave_type, days);
