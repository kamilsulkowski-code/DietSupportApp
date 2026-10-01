-- Forma: persisted AI-generated meal plans and Biedronka shopping cycles.
-- Apply in the Supabase SQL Editor after docs/supabase-schema.sql.

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  target_kcal integer not null check (target_kcal >= 1200),
  target_protein_g integer not null check (target_protein_g >= 1),
  content jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  check (cycle_end >= cycle_start)
);

create index if not exists meal_plans_user_created_at_idx
  on public.meal_plans (user_id, created_at desc);

create table if not exists public.shopping_cycles (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.meal_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  items jsonb not null,
  promotions jsonb not null default '[]'::jsonb,
  promotion_source_url text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists shopping_cycles_user_created_at_idx
  on public.shopping_cycles (user_id, created_at desc);

alter table public.meal_plans enable row level security;
alter table public.shopping_cycles enable row level security;

drop policy if exists "Users read their meal plans" on public.meal_plans;
create policy "Users read their meal plans" on public.meal_plans
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read their shopping cycles" on public.shopping_cycles;
create policy "Users read their shopping cycles" on public.shopping_cycles
  for select to authenticated using ((select auth.uid()) = user_id);

-- Inserts are deliberately not granted to the browser. The generate-plan Edge
-- Function writes with the service role after it verifies the requesting user.
