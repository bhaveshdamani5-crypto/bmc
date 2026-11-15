-- 0004_platform.sql : jobs, subscriptions, audit log
create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 5,
  status text not null default 'queued' check (status in ('queued','running','done','dead')),
  last_error text,
  created_at timestamptz not null default now()
);
create index on jobs (status, run_at);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid unique not null references restaurants(id) on delete cascade,
  plan text not null default 'starter',
  provider_subscription_id text,
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','cancelled')),
  current_period_end timestamptz
);

create table audit_log (
  id bigint generated always as identity primary key,
  restaurant_id uuid references restaurants(id) on delete set null,
  actor text not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (restaurant_id, created_at desc);
