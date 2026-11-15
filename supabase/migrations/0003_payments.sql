-- 0003_payments.sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  provider_payment_id text unique,
  amount_paise int not null check (amount_paise >= 0),
  status text not null default 'created'
    check (status in ('created','captured','failed','refunded','partially_refunded')),
  method text,
  raw jsonb,
  created_at timestamptz not null default now(),
  captured_at timestamptz,
  unique (provider, provider_order_id)
);
create index on payments (order_id);
create index on payments (restaurant_id, created_at desc);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  amount_paise int not null check (amount_paise > 0),
  reason text not null,
  provider_refund_id text unique,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  created_at timestamptz not null default now()
);
create index on refunds (payment_id);

create table webhook_events (                      -- dedupe + debugging; service role only
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- Per-restaurant gateway credentials (content.md 8.2, option A). Values are ENCRYPTED by the app
-- before insert. Service role only: no policies, no grants to authenticated.
create table payment_accounts (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  provider text not null,
  key_id text not null,
  secret_encrypted text not null,
  webhook_secret_encrypted text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, provider)
);
