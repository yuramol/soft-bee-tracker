begin;

select plan(36);

-- seeded users:
--   a01 → admin,   a02 → manager (responsible for b01–b03),   a03 → worker
-- seeded projects:
--   b01 → 'Website Redesign' (client 'Acme Studio'), b02 → 'Mobile App', b03 → 'Internal Operations'
-- seeded rates:
--   b01/a03 = 45.00,   b02/a03 = 50.00,   b03/a03 = 0.00 (zero; billable tests use their own data)
--
-- all test data lives in 2001 so it never overlaps the local database's real entries.

-- ---------------------------------------------------------------------------
-- extra users and project for permission and isolation tests
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000c001', 'worker2@invoice.test',  '{"username": "inv-worker-two"}'),
  ('00000000-0000-0000-0000-00000000c002', 'manager2@invoice.test', '{"username": "inv-manager-two"}');

update public.user_access set role = 'manager'
where user_id = '00000000-0000-0000-0000-00000000c002';

-- a second project whose responsible person is manager-two (not the seeded manager a02)
insert into public.projects (id, name, client, type, manager_id)
values ('00000000-0000-0000-0000-00000000d001', 'Invoice Test Project', 'Test Corp', 'time_material', '00000000-0000-0000-0000-00000000c002');

-- assign seeded worker and worker-two to the test project with rates
insert into public.project_rates (project_id, user_id, rate)
values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03', 100.00),
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001',  80.00);

-- approved tracker entries for the main test project in 2001
insert into public.trackers (id, date, duration_minutes, status, project_id, user_id)
values
  -- worker a03: 90 minutes (1.5 h) at 100.00 → line = 150.00
  ('00000000-0000-0000-0000-00000000e001', '2001-01-10', 90, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03'),
  -- worker-two: 40 minutes (two 20-min entries) at 80.00 → grouped line = 0.67 (40 × 80 / 60, rounded)
  ('00000000-0000-0000-0000-00000000e002', '2001-01-11', 20, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000e003', '2001-01-12', 20, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001'),
  -- should be excluded: new, rejected, out of period, zero minutes, still live
  ('00000000-0000-0000-0000-00000000e004', '2001-01-10', 60, 'new',      '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e005', '2001-01-10', 60, 'rejected', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e006', '2001-02-01', 60, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e007', '2001-01-10',  0, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03');

-- still-running live entry (is_live + live_status = 'start')
insert into public.trackers (id, date, duration_minutes, is_live, live_status, status, project_id, user_id)
values ('00000000-0000-0000-0000-00000000e008', '2001-01-10', 30, true, 'start', 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03');

-- ---------------------------------------------------------------------------
-- helper: call create_invoice as the seeded manager-two (responsible for d001)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

-- ===========================
-- 1. Successful invoice creation
-- ===========================
create temp table created_invoice on commit drop as
select public.create_invoice(
  '00000000-0000-0000-0000-00000000d001',
  '2001-01-01',
  '2001-01-31'
) as id;

grant select on created_invoice to authenticated;

-- invoice header exists
select isnt(
  (select id from created_invoice),
  null,
  'create_invoice returns a uuid'
);

select is(
  (select project_id::text from public.invoices where id = (select id from created_invoice)),
  '00000000-0000-0000-0000-00000000d001',
  'invoice is linked to the correct project'
);

select is(
  (select project_name from public.invoices where id = (select id from created_invoice)),
  'Invoice Test Project',
  'project_name is snapshotted'
);

select is(
  (select client_name from public.invoices where id = (select id from created_invoice)),
  'Test Corp',
  'client_name is snapshotted'
);

select is(
  (select currency from public.invoices where id = (select id from created_invoice)),
  'USD',
  'currency defaults to USD'
);

select ok(
  (select number from public.invoices where id = (select id from created_invoice)) ~ '^INV-\d{4}-\d{4}$',
  'invoice number matches INV-YYYY-NNNN format'
);

-- ===========================
-- 2. Line items and calculations
-- ===========================

-- worker a03: 90 min × 100.00 / 60 = 150.00
select is(
  (select amount from public.invoice_lines
   where invoice_id = (select id from created_invoice)
     and user_id = '00000000-0000-0000-0000-000000000a03'),
  150.00,
  '90 min at 100.00/h = 150.00 (1.5 h, fractional, no premature rounding)'
);

select is(
  (select hours from public.invoice_lines
   where invoice_id = (select id from created_invoice)
     and user_id = '00000000-0000-0000-0000-000000000a03'),
  1.5000,
  'hours stored as exact fractional value (90 / 60 = 1.5)'
);

-- worker-two: 40 min × 80.00 / 60 = 53.33 (rounded half-away-from-zero)
select is(
  (select amount from public.invoice_lines
   where invoice_id = (select id from created_invoice)
     and user_id = '00000000-0000-0000-0000-00000000c001'),
  53.33,
  '40 min at 80.00/h = 53.33 (two entries summed before rounding)'
);

select is(
  (select minutes from public.invoice_lines
   where invoice_id = (select id from created_invoice)
     and user_id = '00000000-0000-0000-0000-00000000c001'),
  40,
  'two 20-min entries are grouped into one 40-min line'
);

-- invoice total = sum of rounded line amounts
select is(
  (select total from public.invoices where id = (select id from created_invoice)),
  203.33,
  'total = 150.00 + 53.33 = 203.33'
);

-- two lines in total
select is(
  (select count(*)::int from public.invoice_lines where invoice_id = (select id from created_invoice)),
  2,
  'two lines: one per developer'
);

-- ===========================
-- 3. Tracker entries are linked
-- ===========================
select is(
  (select count(*)::int from public.trackers
   where invoice_id = (select id from created_invoice)),
  3,
  'exactly 3 entries are linked to the invoice (e001, e002, e003)'
);

select is(
  (select invoice_id::text from public.trackers where id = '00000000-0000-0000-0000-00000000e001'),
  (select id::text from created_invoice),
  'approved in-period entry is linked'
);

-- ===========================
-- 4. Excluded entries remain unlinked
-- ===========================
select is(
  (select invoice_id from public.trackers where id = '00000000-0000-0000-0000-00000000e004'),
  null,
  'new entry is not linked'
);

select is(
  (select invoice_id from public.trackers where id = '00000000-0000-0000-0000-00000000e005'),
  null,
  'rejected entry is not linked'
);

select is(
  (select invoice_id from public.trackers where id = '00000000-0000-0000-0000-00000000e006'),
  null,
  'out-of-period entry is not linked'
);

select is(
  (select invoice_id from public.trackers where id = '00000000-0000-0000-0000-00000000e007'),
  null,
  'zero-minute entry is not linked'
);

select is(
  (select invoice_id from public.trackers where id = '00000000-0000-0000-0000-00000000e008'),
  null,
  'still-running live entry is not linked'
);

-- ===========================
-- 5. Snapshot immutability — changes to source data do not alter the invoice
-- ===========================
-- change the tracker minutes after billing
update public.trackers set duration_minutes = 999
where id = '00000000-0000-0000-0000-00000000e001';

-- change the billing rate after billing
update public.project_rates
set rate = 999.99
where project_id = '00000000-0000-0000-0000-00000000d001'
  and user_id = '00000000-0000-0000-0000-000000000a03';

-- reset role so we can read the invoice as manager-two
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

select is(
  (select amount from public.invoice_lines
   where invoice_id = (select id from created_invoice)
     and user_id = '00000000-0000-0000-0000-000000000a03'),
  150.00,
  'line amount is unchanged after tracker minutes were modified'
);

select is(
  (select total from public.invoices where id = (select id from created_invoice)),
  203.33,
  'invoice total is unchanged after billing rate was modified'
);

-- ===========================
-- 6. Duplicate billing protection — same period returns an error
-- ===========================
select throws_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d001',
      '2001-01-01',
      '2001-01-31'
    )$$,
  'P0002',
  null,
  'second create for the same period raises no_data_found (all entries already billed)'
);

-- ===========================
-- 7. Error cases
-- ===========================

-- project with zero-minute entries only (create a fresh scenario)
insert into public.projects (id, name, client, type, manager_id)
values ('00000000-0000-0000-0000-00000000d002', 'Empty Project', 'Nobody', 'time_material', '00000000-0000-0000-0000-00000000c002');

insert into public.project_rates (project_id, user_id, rate)
values ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-000000000a03', 50.00);

insert into public.trackers (date, duration_minutes, status, project_id, user_id)
values ('2001-01-10', 60, 'new', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-000000000a03');

select throws_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d002',
      '2001-01-01',
      '2001-01-31'
    )$$,
  'P0002',
  null,
  'no approved entries raises no_data_found'
);

-- project with an approved entry but a missing billing rate
insert into public.projects (id, name, client, type, manager_id)
values ('00000000-0000-0000-0000-00000000d003', 'No Rate Project', 'Nobody', 'time_material', '00000000-0000-0000-0000-00000000c002');

insert into public.project_rates (project_id, user_id, rate)
values ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-000000000a03', 0.00);

insert into public.trackers (date, duration_minutes, status, project_id, user_id)
values ('2001-01-10', 60, 'approved', '00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-000000000a03');

select throws_like(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d003',
      '2001-01-01',
      '2001-01-31'
    )$$,
  '%a client billing rate is missing for%',
  'zero billing rate raises a descriptive error including the developer name'
);

-- period_start > period_end
select throws_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d001',
      '2001-02-01',
      '2001-01-01'
    )$$,
  '23514',
  null,
  'inverted period raises check_violation'
);

-- ===========================
-- 8. Access control
-- ===========================

-- worker cannot create an invoice
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}',
  true);

select throws_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d001',
      '2001-06-01',
      '2001-06-30'
    )$$,
  '42501',
  null,
  'a worker cannot create an invoice'
);

-- manager who is not responsible for the project cannot create an invoice
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}',
  true);

select throws_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d001',
      '2001-06-01',
      '2001-06-30'
    )$$,
  '42501',
  null,
  'a manager not responsible for the project cannot create an invoice'
);

-- responsible manager can read their invoice
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

select isnt(
  (select id from public.invoices where id = (select id from created_invoice)),
  null,
  'the responsible manager can select their invoice'
);

-- other manager cannot read it
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}',
  true);

select is(
  (select count(*)::int from public.invoices where id = (select id from created_invoice)),
  0,
  'a manager not responsible for the project cannot see the invoice'
);

-- worker cannot read it either
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}',
  true);

select is(
  (select count(*)::int from public.invoices where id = (select id from created_invoice)),
  0,
  'a worker cannot see the invoice'
);

-- admin can read and create invoices on any project
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}',
  true);

select isnt(
  (select id from public.invoices where id = (select id from created_invoice)),
  null,
  'an admin can select any invoice'
);

-- add a fresh approved entry for the admin's creation test
insert into public.trackers (date, duration_minutes, status, project_id, user_id)
values ('2001-03-10', 60, 'approved', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000000a03');

select lives_ok(
  $$select public.create_invoice(
      '00000000-0000-0000-0000-00000000d001',
      '2001-03-01',
      '2001-03-31'
    )$$,
  'an admin can create an invoice for any project'
);

-- ===========================
-- 9. Guard trigger: direct invoice_id change is blocked
-- ===========================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

select throws_ok(
  $$update public.trackers
    set invoice_id = null
    where id = '00000000-0000-0000-0000-00000000e001'$$,
  '23514',
  null,
  'clearing invoice_id directly is blocked by the guard trigger'
);

-- ===========================
-- 10. Direct insert into invoices is denied (no insert policy)
-- ===========================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

select throws_ok(
  $$insert into public.invoices (number, issue_date, project_id, project_name, client_name,
      period_start, period_end, issuer_id, issuer_name, issuer_email, currency, total)
    values ('INV-DIRECT', '2001-01-01', '00000000-0000-0000-0000-00000000d001',
      'x', 'y', '2001-01-01', '2001-01-31', '00000000-0000-0000-0000-00000000c002',
      'x', 'x@x.com', 'USD', 0)$$,
  '42501',
  null,
  'direct insert into invoices is denied for authenticated role'
);

-- ===========================
-- 11. anon has no execute privilege
-- ===========================
reset role;

select ok(
  not has_function_privilege('anon', 'public.create_invoice(uuid, date, date)', 'execute'),
  'anon cannot call create_invoice'
);

-- ===========================
-- 12. Small rounding edge case: 30 min at 0.01 = 0.01 (not 0.00)
-- ===========================
-- use the seeded project b01/a03 (rate = 45.00 after the rate-change reverts below
-- — actually it was updated to 999.99 above, so we insert a fresh trackers row and
-- test via a dedicated project to keep the scenario clean)

-- project d004: worker with 30 min at 0.01/h
insert into public.projects (id, name, client, type, manager_id)
values ('00000000-0000-0000-0000-00000000d004', 'Tiny Rate Project', 'Penny Inc', 'time_material', '00000000-0000-0000-0000-00000000c002');

insert into public.project_rates (project_id, user_id, rate)
values ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-000000000a03', 0.01);

insert into public.trackers (date, duration_minutes, status, project_id, user_id)
values ('2001-04-10', 30, 'approved', '00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-000000000a03');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","user_role":"manager"}',
  true);

create temp table tiny_inv on commit drop as
select public.create_invoice('00000000-0000-0000-0000-00000000d004', '2001-04-01', '2001-04-30') as id;

grant select on tiny_inv to authenticated;

select is(
  (select amount from public.invoice_lines where invoice_id = (select id from tiny_inv)),
  0.01,
  '30 min at 0.01/h rounds to 0.01 (not 0.00)'
);

select * from finish();

rollback;
