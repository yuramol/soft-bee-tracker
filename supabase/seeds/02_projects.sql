-- seed: local development projects

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
