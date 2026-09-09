-- seed: local development projects and worker assignments

insert into public.projects (
  id,
  name,
  client,
  note,
  start_date,
  status,
  type,
  manager_id
)
values
  (
    '00000000-0000-0000-0000-000000000b01',
    'Website Redesign',
    'Acme Studio',
    'Refresh the marketing site and customer portal.',
    '2026-08-01',
    'active',
    'fixed_price',
    '00000000-0000-0000-0000-000000000a02'
  ),
  (
    '00000000-0000-0000-0000-000000000b02',
    'Mobile App',
    'Northstar Labs',
    'Build the first release of the customer mobile application.',
    '2026-08-10',
    'active',
    'time_material',
    '00000000-0000-0000-0000-000000000a02'
  ),
  (
    '00000000-0000-0000-0000-000000000b03',
    'Internal Operations',
    'Soft Bee',
    'Internal meetings, documentation, and process improvements.',
    '2026-08-01',
    'active',
    'non_profit',
    '00000000-0000-0000-0000-000000000a02'
  )
on conflict (name) do update
set
  client = excluded.client,
  note = excluded.note,
  start_date = excluded.start_date,
  status = excluded.status,
  type = excluded.type,
  manager_id = excluded.manager_id;

-- assign the seeded worker so tracker creation works under project_rates RLS
insert into public.project_rates (project_id, user_id, rate)
values
  ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03', 45.00),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000a03', 50.00),
  ('00000000-0000-0000-0000-000000000b03', '00000000-0000-0000-0000-000000000a03', 0.00)
on conflict (project_id, user_id) do update
set rate = excluded.rate;
