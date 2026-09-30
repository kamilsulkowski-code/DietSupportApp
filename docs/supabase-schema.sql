-- Forma: schema for cross-device data synchronisation.
-- Run this whole file in Supabase SQL Editor before adding the public client configuration.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  shopping_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read only their profile" on public.profiles;
create policy "Users read only their profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users create only their profile" on public.profiles;
create policy "Users create only their profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users update only their profile" on public.profiles;
create policy "Users update only their profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

