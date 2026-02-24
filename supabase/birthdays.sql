-- Birthdays table and policies (Postgres / Supabase)

create table if not exists public.birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birthdate date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birthdays_user_id_idx on public.birthdays(user_id);
create index if not exists birthdays_birthdate_idx on public.birthdays(birthdate);

alter table public.birthdays enable row level security;

-- Allow users to read their own birthdays
create policy "Birthdays are readable by owner"
  on public.birthdays
  for select
  using (auth.uid() = user_id);

-- Allow users to insert their own birthdays
create policy "Birthdays are insertable by owner"
  on public.birthdays
  for insert
  with check (auth.uid() = user_id);

-- Allow users to update their own birthdays
create policy "Birthdays are updatable by owner"
  on public.birthdays
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow users to delete their own birthdays
create policy "Birthdays are deletable by owner"
  on public.birthdays
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_birthdays_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists birthdays_set_updated_at on public.birthdays;
create trigger birthdays_set_updated_at
before update on public.birthdays
for each row execute function public.set_birthdays_updated_at();
