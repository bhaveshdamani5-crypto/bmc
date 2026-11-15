-- Tenant isolation + privilege tests. Runs inside one transaction and rolls back.
-- Run locally with: bash supabase/tests/run-local.sh
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'TEST FAILED: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- fixtures: owner A (Brew Moon), owner B (Demo Two), kitchen K (Brew Moon)
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test'),
  ('cccccccc-0000-4000-8000-000000000003', 'k@test');
insert into staff_users (id, restaurant_id, role)
select 'aaaaaaaa-0000-4000-8000-000000000001', id, 'owner' from restaurants where slug = 'brew-moon';
insert into staff_users (id, restaurant_id, role)
select 'bbbbbbbb-0000-4000-8000-000000000002', id, 'owner' from restaurants where slug = 'demo-cafe-two';
insert into staff_users (id, restaurant_id, role)
select 'cccccccc-0000-4000-8000-000000000003', id, 'kitchen' from restaurants where slug = 'brew-moon';

-- a paid order in Brew Moon (created as superuser, like server code would)
insert into orders (restaurant_id, table_id, business_date, order_number, status, subtotal_paise, tax_paise, total_paise)
select r.id, t.id, current_date, 1, 'paid', 10000, 500, 10500
from restaurants r join tables t on t.restaurant_id = r.id
where r.slug = 'brew-moon' and t.label = 'T1';

-- ---------------------------------------------------------------- 1. seed sanity
do $$
declare n_items int; n_tables int; bad int;
begin
  select count(*) into n_items from items where restaurant_id = (select id from restaurants where slug='brew-moon');
  perform pg_temp.check(n_items >= 100, format('seed has %s Brew Moon items (>=100)', n_items));
  select count(*) into n_tables from tables where restaurant_id = (select id from restaurants where slug='brew-moon');
  perform pg_temp.check(n_tables = 10, 'seed has 10 tables');
  select count(*) into bad from item_variants v join items i on i.id = v.item_id where v.restaurant_id <> i.restaurant_id;
  perform pg_temp.check(bad = 0, 'variants never point at another restaurant''s item');
  select count(*) into bad from items where base_price_paise <= 0;
  perform pg_temp.check(bad = 0, 'every item has a positive price');
end $$;

-- ---------------------------------------------------------------- 2. order numbers
do $$
declare r1 uuid; r2 uuid; a int; b int; c int;
begin
  select id into r1 from restaurants where slug='brew-moon';
  select id into r2 from restaurants where slug='demo-cafe-two';
  select order_number into a from next_order_number(r1);
  select order_number into b from next_order_number(r1);
  select order_number into c from next_order_number(r2);
  perform pg_temp.check(a = 1 and b = 2, 'order numbers count up per restaurant');
  perform pg_temp.check(c = 1, 'order numbers are independent between restaurants');
end $$;

-- ---------------------------------------------------------------- 3. staff A sees only own tenant
do $$
declare t text; other int; own int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-0000-4000-8000-000000000001')::text, true);
  execute 'set local role authenticated';

  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='restaurant_id'
      and c.table_name in ('tables','categories','items','item_variants','modifier_groups','modifiers',
                           'orders','order_items','order_events','payments','refunds','subscriptions','staff_users')
  loop
    execute format('select count(*) from %I where restaurant_id <> current_restaurant_id()', t) into other;
    perform pg_temp.check(other = 0, format('A sees 0 foreign rows in %s', t));
  end loop;

  select count(*) into own from items;
  perform pg_temp.check(own >= 100, 'A sees own menu items');
  select count(*) into own from orders;
  perform pg_temp.check(own = 1, 'A sees own order');
  select count(*) into other from restaurants;
  perform pg_temp.check(other = 1, 'A sees exactly one restaurant row');

  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 4. staff B cannot see A's data
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','bbbbbbbb-0000-4000-8000-000000000002')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from orders;           perform pg_temp.check(n = 0, 'B sees 0 of A''s orders');
  select count(*) into n from items;            perform pg_temp.check(n = 2, 'B sees only its own 2 items');
  select count(*) into n from tables;           perform pg_temp.check(n = 3, 'B sees only its own 3 tables');
  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 5. anon has no access
do $$
declare denied boolean := false;
begin
  execute 'set local role anon';
  begin perform count(*) from items; exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'anon cannot read items');
  denied := false;
  begin perform count(*) from orders; exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'anon cannot read orders');
  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 6. server-only tables are closed to staff
do $$
declare t text; denied boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-0000-4000-8000-000000000001')::text, true);
  execute 'set local role authenticated';
  foreach t in array array['webhook_events','jobs','payment_accounts','order_counters'] loop
    denied := false;
    begin execute format('select count(*) from %I', t);
    exception when insufficient_privilege then denied := true; end;
    perform pg_temp.check(denied, format('staff cannot read %s', t));
  end loop;
  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 7. staff cannot write orders/payments directly
do $$
declare denied boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-0000-4000-8000-000000000001')::text, true);
  execute 'set local role authenticated';
  begin update orders set status = 'completed'; exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'owner cannot update orders directly (server only)');
  denied := false;
  begin delete from payments; exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'owner cannot delete payments');
  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 8. menu writes: owner yes, kitchen no, cross-tenant no
do $$
declare n int; denied boolean := false; rid_b uuid; item_b uuid; item_a uuid;
begin
  select id into rid_b from restaurants where slug='demo-cafe-two';
  select id into item_b from items where restaurant_id = rid_b limit 1;
  select id into item_a from items where restaurant_id = (select id from restaurants where slug='brew-moon') limit 1;

  -- owner A can edit own menu
  perform set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-0000-4000-8000-000000000001')::text, true);
  execute 'set local role authenticated';
  update items set name = name where id = item_a;
  get diagnostics n = row_count;
  perform pg_temp.check(n = 1, 'owner can update own menu item');

  -- owner A cannot touch B's item (row invisible => 0 rows)
  update items set name = 'hacked' where id = item_b;
  get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'owner cannot update another restaurant''s item');

  -- owner A cannot insert a category into B's restaurant
  begin insert into categories (restaurant_id, name) values (rid_b, 'evil'); exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'owner cannot insert into another restaurant');
  execute 'reset role';

  -- kitchen cannot edit menu directly
  perform set_config('request.jwt.claims', json_build_object('sub','cccccccc-0000-4000-8000-000000000003')::text, true);
  execute 'set local role authenticated';
  update items set base_price_paise = 1 where id = item_a;
  get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'kitchen cannot change prices');
  denied := false;
  begin insert into items (restaurant_id, name, base_price_paise)
        values ((select id from restaurants where slug='brew-moon'), 'x', 1);
  exception when insufficient_privilege then denied := true; end;
  perform pg_temp.check(denied, 'kitchen cannot create items');
  execute 'reset role';
end $$;

-- ---------------------------------------------------------------- 9. availability toggle path
do $$
declare avail boolean; item_a uuid; item_b uuid; denied boolean := false;
begin
  select id into item_a from items where restaurant_id = (select id from restaurants where slug='brew-moon') limit 1;
  select id into item_b from items where restaurant_id = (select id from restaurants where slug='demo-cafe-two') limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub','cccccccc-0000-4000-8000-000000000003')::text, true);
  execute 'set local role authenticated';
  perform set_item_availability(item_a, false);
  execute 'reset role';
  select is_available into avail from items where id = item_a;
  perform pg_temp.check(avail = false, 'kitchen can mark own item out of stock via function');

  execute 'set local role authenticated';
  begin perform set_item_availability(item_b, false); exception when others then denied := true; end;
  execute 'reset role';
  perform pg_temp.check(denied, 'kitchen cannot toggle another restaurant''s item');
end $$;

-- ---------------------------------------------------------------- 10. helper functions closed to staff
do $$
declare denied boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-0000-4000-8000-000000000001')::text, true);
  execute 'set local role authenticated';
  begin perform next_order_number((select id from restaurants where slug='brew-moon'));
  exception when insufficient_privilege then denied := true; end;
  execute 'reset role';
  perform pg_temp.check(denied, 'staff cannot call next_order_number (server only)');
end $$;

rollback;
\echo ALL TESTS PASSED
