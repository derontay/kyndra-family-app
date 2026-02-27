-- Verify birthdays table + People linking columns
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

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'birthdays'
order by ordinal_position;
