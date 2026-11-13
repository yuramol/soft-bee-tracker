begin;

select plan(1);

select is_empty(
  $$ select c.relname::text
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not c.relrowsecurity $$,
  'every table in the public schema has row level security enabled'
);

select * from finish();

rollback;
