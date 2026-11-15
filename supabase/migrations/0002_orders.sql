-- 0002_orders.sql : orders, items, audit trail, per-day order numbers
create type order_status as enum (
  'pending_payment','paid','accepted','preparing','ready','served',
  'completed','cancelled','expired','refund_pending','refunded'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references tables(id),
  business_date date not null,
  order_number int not null,                       -- shown to staff: "order 14"
  status order_status not null default 'pending_payment',
  subtotal_paise int not null check (subtotal_paise >= 0),
  tax_paise int not null check (tax_paise >= 0),
  total_paise int not null check (total_paise >= 0),
  guest_note text,
  guest_phone text,
  idempotency_key text unique,
  access_token text unique not null default encode(extensions.gen_random_bytes(16), 'hex'), -- guest status link
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, business_date, order_number)
);
create index on orders (restaurant_id, status, created_at desc);
create index on orders (table_id, created_at desc);
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  name_snapshot text not null,                     -- copied at order time; menu may change later
  variant_snapshot text,
  modifiers_snapshot jsonb not null default '[]',
  unit_price_paise int not null check (unit_price_paise >= 0),
  quantity int not null check (quantity > 0),
  note text
);
create index on order_items (order_id);

create table order_events (                        -- append-only audit trail
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  actor text not null,                             -- 'system' | 'gateway' | staff user id
  reason text,
  created_at timestamptz not null default now()
);
create index on order_events (order_id, created_at);

-- Per-restaurant, per-local-day order counter. Race-safe via upsert.
create table order_counters (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  business_date date not null,
  last_number int not null default 0,
  primary key (restaurant_id, business_date)
);

create or replace function next_order_number(p_restaurant_id uuid)
returns table (business_date date, order_number int)
language plpgsql as $$
declare
  v_tz text;
  v_date date;
  v_num int;
begin
  select timezone into v_tz from restaurants where id = p_restaurant_id;
  if v_tz is null then
    raise exception 'unknown restaurant %', p_restaurant_id;
  end if;
  v_date := (now() at time zone v_tz)::date;

  insert into order_counters as c (restaurant_id, business_date, last_number)
  values (p_restaurant_id, v_date, 1)
  on conflict on constraint order_counters_pkey
  do update set last_number = c.last_number + 1
  returning c.last_number into v_num;

  return query select v_date, v_num;
end $$;
