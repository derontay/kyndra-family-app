-- BEFORE status
select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'birthdays'
  ) as has_birthdays_table,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'email'
  ) as has_birthdays_email,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'relationship'
  ) as has_birthdays_relationship,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'linked_profile_id'
  ) as has_birthdays_linked_profile_id;

-- Apply safe migration
alter table public.birthdays
  add column if not exists email text,
  add column if not exists relationship text,
  add column if not exists linked_profile_id uuid;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';

-- AFTER status
select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'birthdays'
  ) as has_birthdays_table,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'email'
  ) as has_birthdays_email,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'relationship'
  ) as has_birthdays_relationship,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birthdays'
      and column_name = 'linked_profile_id'
  ) as has_birthdays_linked_profile_id;

-- Smoke test
select id, user_id, name, birthdate, email, relationship, linked_profile_id
from public.birthdays
order by created_at desc nulls last, birthdate asc nulls last
limit 5;
