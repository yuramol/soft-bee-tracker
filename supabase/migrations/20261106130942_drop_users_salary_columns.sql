-- migration: drop salary columns from public.users
-- affected objects: columns public.users.salary, salary_info, type_salary; type public.salary_type
-- special risks: destructive, stored salary values are lost

-- safety: no other object references these columns or the enum
alter table public.users
  drop column salary,
  drop column salary_info,
  drop column type_salary;

drop type public.salary_type;
