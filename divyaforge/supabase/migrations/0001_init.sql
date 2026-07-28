-- DivyaForge M0 schema (PRD §9, kickoff data model).
-- Catalog tables (deities/parts/constraints) are public-readable reference
-- data seeded from supabase/seed.sql (generated from catalog.json).
-- designs/orders are user data guarded by RLS.

create table if not exists public.deities (
  id text primary key,
  name_en text not null,
  name_hi text not null,
  -- Customization tier exists in the schema NOW (kickoff requirement):
  -- A = full customization, B = size/material/base only, C = parametric toggles.
  tier text not null check (tier in ('A', 'B', 'C')),
  style_tags text[] not null default '{}',
  forms jsonb not null default '[]',
  poses jsonb not null default '[]',
  body_zones jsonb not null default '[]'
);

create table if not exists public.parts (
  id text primary key,
  deity_id text references public.deities (id), -- null = universal part
  category text not null
    check (category in ('attire', 'ornament', 'ayudha', 'base', 'vahana')),
  tab text not null,
  slot text not null,
  name_en text not null,
  name_hi text not null,
  mesh_url text not null,
  thumbnail_url text not null,
  color_zones jsonb not null default '[]',
  constraint_tags text[] not null default '{}',
  price_volume numeric not null default 0,
  style_tags text[] not null default '{}'
);

create table if not exists public.constraints (
  id text primary key,
  deity_id text references public.deities (id), -- null = all deities
  rule_type text not null check (rule_type in ('deny', 'slot_allow', 'limit')),
  part_tag text not null,
  deity_style_tag text,
  slot_side text check (slot_side in ('left', 'right')),
  max_count int,
  reason_en text not null,
  reason_hi text not null
);

create table if not exists public.designs (
  id text primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  name text not null,
  config jsonb not null, -- the DesignConfig JSON — designs are params, never meshes
  schema_version int not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designs_owner_idx on public.designs (owner, updated_at desc);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  design_id text references public.designs (id) on delete set null,
  design_config jsonb not null, -- frozen copy at order time
  material text not null,
  size_inches int not null,
  price_inr int not null, -- always recomputed server-side
  status text not null default 'stub_created',
  -- ============================================================
  -- RAZORPAY INTEGRATION POINT (M1): payment order id captured at
  -- checkout; see app/api/orders/route.ts for the flow marker.
  -- ============================================================
  razorpay_order_id text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- ---------------------------------------------------------------- RLS

alter table public.deities enable row level security;
alter table public.parts enable row level security;
alter table public.constraints enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;

-- Catalog: world-readable, never client-writable.
create policy "deities are public" on public.deities
  for select using (true);
create policy "parts are public" on public.parts
  for select using (true);
create policy "constraints are public" on public.constraints
  for select using (true);

-- Designs: owners have full control; public designs are readable by anyone
-- (that is what a share link is).
create policy "read own or public designs" on public.designs
  for select using (is_public or owner = auth.uid());
create policy "insert own designs" on public.designs
  for insert with check (owner = auth.uid());
create policy "update own designs" on public.designs
  for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "delete own designs" on public.designs
  for delete using (owner = auth.uid());

-- Orders: signed-in users create and see their own.
create policy "insert own orders" on public.orders
  for insert with check (user_id = auth.uid());
create policy "read own orders" on public.orders
  for select using (user_id = auth.uid());
