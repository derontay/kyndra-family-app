-- Add optional People fields for linking + relationship
alter table public.birthdays
  add column if not exists email text,
  add column if not exists relationship text,
  add column if not exists linked_profile_id uuid;
