-- 0005_rls.sql : tenant isolation. Every table has RLS enabled.
-- Model:
--   * Staff (authenticated) can READ their own restaurant's rows.
--   * Menu/table/settings writes: owner + manager only.
--   * Orders, payments, refunds, events: staff can only READ. All writes happen in server
--     code using the service role (which bypasses RLS) after an explicit role check.
--   * Kitchen/captain can flip item availability ONLY through set_item_availability().
--   * Guests (anon) have no database access at all; they go through server code.

-- ---------------------------------------------------------------- helpers
create or replace function current_restaurant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select restaurant_id from staff_users where id = auth.uid()
$$;

create or replace function current_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff_users where id = auth.uid()
$$;

create or replace function is_owner_or_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_staff_role() in ('owner','manager'), false)
$$;

revoke all on function current_restaurant_id(), current_staff_role(), is_owner_or_manager() from public;
grant execute on function current_restaurant_id(), current_staff_role(), is_owner_or_manager() to authenticated;

-- Narrow, safe write path for kitchen/captain: out-of-stock toggle only.
create or replace function set_item_availability(p_item_id uuid, p_available boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rid uuid := current_restaurant_id();
begin
  if v_rid is null then
    raise exception 'not a staff user' using errcode = '42501';
  end if;
  update items set is_available = p_available
   where id = p_item_id and restaurant_id = v_rid;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
end $$;

revoke all on function set_item_availability(uuid, boolean) from public;
grant execute on function set_item_availability(uuid, boolean) to authenticated;

-- next_order_number() is for server code only.
revoke all on function next_order_number(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- enable RLS everywhere
alter table restaurants       enable row level security;
alter table staff_users       enable row level security;
alter table tables            enable row level security;
alter table categories        enable row level security;
alter table items             enable row level security;
alter table item_variants     enable row level security;
alter table modifier_groups   enable row level security;
alter table modifiers         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table order_events      enable row level security;
alter table order_counters    enable row level security;
alter table payments          enable row level security;
alter table refunds           enable row level security;
alter table webhook_events    enable row level security;
alter table payment_accounts  enable row level security;
alter table jobs              enable row level security;
alter table subscriptions     enable row level security;
alter table audit_log         enable row level security;

-- ---------------------------------------------------------------- privileges (defense in depth)
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Server-only tables: no access for logged-in staff either.
revoke all on webhook_events, jobs, payment_accounts, order_counters from authenticated;

-- Read-only for staff (writes via service role).
revoke insert, update, delete on orders, order_items, order_events, payments, refunds,
                                 audit_log, subscriptions from authenticated;

-- ---------------------------------------------------------------- policies
-- restaurants
create policy restaurants_select on restaurants for select to authenticated
  using (id = current_restaurant_id());
create policy restaurants_update on restaurants for update to authenticated
  using (id = current_restaurant_id() and is_owner_or_manager())
  with check (id = current_restaurant_id());

-- staff_users: everyone on the team can see the team; changes via server (owner flow).
create policy staff_select on staff_users for select to authenticated
  using (restaurant_id = current_restaurant_id());
revoke insert, update, delete on staff_users from authenticated;

-- menu + tables: read for all staff, write for owner/manager
do $$
declare t text;
begin
  foreach t in array array['tables','categories','items','item_variants','modifier_groups','modifiers']
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (restaurant_id = current_restaurant_id())',
      t || '_select', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (restaurant_id = current_restaurant_id() and is_owner_or_manager())',
      t || '_insert', t);
    execute format(
      'create policy %I on %I for update to authenticated using (restaurant_id = current_restaurant_id() and is_owner_or_manager()) with check (restaurant_id = current_restaurant_id())',
      t || '_update', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (restaurant_id = current_restaurant_id() and is_owner_or_manager())',
      t || '_delete', t);
  end loop;
end $$;

-- orders & related: read-only for staff of the same restaurant
do $$
declare t text;
begin
  foreach t in array array['orders','order_items','order_events','payments','refunds']
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (restaurant_id = current_restaurant_id())',
      t || '_select', t);
  end loop;
end $$;

-- billing + audit: owner/manager can read
create policy subscriptions_select on subscriptions for select to authenticated
  using (restaurant_id = current_restaurant_id() and is_owner_or_manager());
create policy audit_select on audit_log for select to authenticated
  using (restaurant_id = current_restaurant_id() and current_staff_role() = 'owner');

-- webhook_events, jobs, payment_accounts, order_counters: RLS on + no policies = service role only.

-- ---------------------------------------------------------------- realtime
-- Kitchen tablets and guest status pages subscribe to orders. Realtime respects RLS for staff.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
