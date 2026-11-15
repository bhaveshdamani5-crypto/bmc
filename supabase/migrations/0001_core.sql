-- 0001_core.sql : tenants, staff, tables, menu
create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  phone text,
  address text,
  gstin text,
  logo_url text,
  brand_color text not null default '#d4a24c',
  tax_rate_bps int not null default 500 check (tax_rate_bps between 0 and 10000), -- 500 = 5.00%. VERIFY with accountant
  prices_include_tax boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  accepting_orders boolean not null default true,
  status text not null default 'trial' check (status in ('trial','active','past_due','suspended')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger restaurants_updated_at before update on restaurants
  for each row execute function set_updated_at();

create type staff_role as enum ('owner','manager','kitchen','captain');

create table staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  role staff_role not null,
  name text,
  created_at timestamptz not null default now()
);
create index on staff_users (restaurant_id);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  label text not null,
  token text unique not null default encode(gen_random_bytes(12), 'hex'),
  is_active boolean not null default true,
  unique (restaurant_id, label)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  tagline text,
  sort_order int not null default 0,
  is_active boolean not null default true
);
create index on categories (restaurant_id, sort_order);

create table items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  base_price_paise int not null check (base_price_paise >= 0),
  calories int check (calories is null or calories >= 0),
  is_veg boolean,                                  -- null = decided per variant
  is_available boolean not null default true,      -- the "out of stock" toggle
  is_deleted boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on items (restaurant_id, category_id, sort_order);
create trigger items_updated_at before update on items
  for each row execute function set_updated_at();

create table item_variants (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  name text not null,
  price_delta_paise int not null default 0,        -- added to items.base_price_paise
  calories int check (calories is null or calories >= 0),
  is_veg boolean,
  sort_order int not null default 0
);
create index on item_variants (item_id);

create table modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  name text not null,
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= 1),
  sort_order int not null default 0,
  check (min_select <= max_select)
);
create index on modifier_groups (item_id);

create table modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  group_id uuid not null references modifier_groups(id) on delete cascade,
  name text not null,
  price_delta_paise int not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index on modifiers (group_id);
