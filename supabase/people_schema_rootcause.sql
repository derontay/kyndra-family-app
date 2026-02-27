-- List all relations named "birthdays" across schemas
select n.nspname as schema_name,
       c.relname as relation_name,
       c.relkind as relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relname = 'birthdays'
order by n.nspname;

-- Columns for public.birthdays
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'birthdays'
order by ordinal_position;

-- Apply safe migration
alter table public.birthdays
  add column if not exists email text,
  add column if not exists relationship text,
  add column if not exists linked_profile_id uuid;

-- Reload PostgREST schema cache (both forms)
notify pgrst, 'reload schema';
select pg_notify('pgrst','reload schema');

-- Re-check column existence
select
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
