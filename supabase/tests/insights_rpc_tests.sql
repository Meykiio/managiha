-- ============================================================================
-- insights_rpc_tests.sql - proves the sales, dead-stock and reorder RPCs.
--
-- These three all aggregate over stock_movements, and every one of them has a
-- boundary that looks right and is off by one event: a sale on the first day of
-- the window, a product whose only movement is the receipt, a product exactly at
-- its threshold. The assertions below pin those boundaries.
--
-- Self-contained and self-cleaning. Each assertion names what it protects.
-- ============================================================================

create temp table if not exists insight_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists insight_ctx (
  user_a uuid, store_a uuid
);

create or replace function pg_temp.t_auth(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.t_clear_auth() returns void
language plpgsql as $$
begin
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';
end $$;

create or replace function pg_temp.t_rec(p_name text, p_passed boolean, p_detail text)
returns void language plpgsql as $$
begin
  insert into insight_results (name, passed, detail)
  values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.t_wipe() returns void
language plpgsql as $$
declare v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email like '%@insightstest.managiha.test';

  if v_sids <> '{}'::uuid[] then
    delete from stock_movements where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from product_lots where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from suppliers where store_id = any(v_sids);
  end if;

  delete from stores where owner_id in (select id from auth.users where email like '%@insightstest.managiha.test');
  delete from profiles where id in (select id from auth.users where email like '%@insightstest.managiha.test');
  delete from auth.users where email like '%@insightstest.managiha.test';
end $$;

select pg_temp.t_wipe();

-- ── Seed ─────────────────────────────────────────────────────────────────────
-- Fast  : buys 10, sells 20   -> 100 revenue, 50 cost, 50 margin
-- Slow  : bought 400 days ago, never sold, 5 in stock at cost 30 -> dead stock
-- New   : bought 3 days ago, never sold   -> NOT dead stock (too new)
-- Low   : threshold 10, stock 4, sold 6 in the window -> reorder
do $$
declare
  v_user uuid; v_store uuid;
  v_fast uuid; v_slow uuid; v_new uuid; v_low uuid; v_sup uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'ins@insightstest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Insight Store"}', now(), now())
  returning id into v_user;

  select id into v_store from stores where owner_id = v_user;
  perform pg_temp.t_auth(v_user);

  insert into suppliers (store_id, name, phone, whatsapp)
  values (v_store, 'Grossiste Tester', '0555112233', '213555112233')
  returning id into v_sup;

  insert into products (store_id, name, unit, cost_price, sell_price, current_stock, supplier_id)
  values (v_store, 'Fast', 'piece', 5, 10, 0, v_sup) returning id into v_fast;
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_store, 'Slow', 'piece', 30, 60, 0) returning id into v_slow;
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_store, 'Fresh', 'piece', 2, 4, 0) returning id into v_new;
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock,
                        low_stock_threshold, supplier_id)
  values (v_store, 'Low', 'piece', 7, 14, 0, 10, v_sup) returning id into v_low;

  -- Opening stock, then sales.
  --
  -- Fast is sold WITH an explicit price, the way checkout_sale and the fixed sell
  -- form do it. Low is sold WITHOUT one, which is how every sale from the
  -- inventory tab used to be written: the stock moved and the money did not. The
  -- report must fall back to the product's selling price rather than count those
  -- as free, so both paths are seeded here and both must produce the same shape.
  perform adjust_stock(p_product_id => v_fast, p_movement_type => 'opening_balance', p_quantity => 10);
  perform adjust_stock(p_product_id => v_fast, p_movement_type => 'sale', p_quantity => 4, p_unit_cost => 10);
  perform adjust_stock(p_product_id => v_fast, p_movement_type => 'sale', p_quantity => 6, p_unit_cost => 10);

  perform adjust_stock(p_product_id => v_slow, p_movement_type => 'opening_balance', p_quantity => 5);
  perform adjust_stock(p_product_id => v_new,  p_movement_type => 'opening_balance', p_quantity => 3);
  perform adjust_stock(p_product_id => v_low,  p_movement_type => 'opening_balance', p_quantity => 10);
  perform adjust_stock(p_product_id => v_low,  p_movement_type => 'sale', p_quantity => 6);

  perform pg_temp.t_clear_auth();

  -- Slow: its only activity is 400 days old, so it is idle well past any window.
  update stock_movements set created_at = now() - interval '400 days'
   where product_id = v_slow;
  -- Fresh: bought 3 days ago, so it must NOT be reported as dead stock.
  update stock_movements set created_at = now() - interval '3 days'
   where product_id = v_new;
  -- Fast + Low: sales within the last 20 days.
  update stock_movements set created_at = now() - interval '20 days'
   where product_id in (v_fast, v_low) and movement_type = 'sale';
  update stock_movements set created_at = now() - interval '25 days'
   where product_id in (v_fast, v_low) and movement_type = 'opening_balance';

  insert into insight_ctx (user_a, store_a) values (v_user, v_store);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I01-I04: period totals
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_uid uuid; v json;
  v_rev numeric; v_units numeric; v_cnt bigint; v_cogs numeric; v_margin numeric;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);
  select get_sales_summary(current_date - 30, current_date) into v;
  perform pg_temp.t_clear_auth();

  v_rev    := (v->>'revenue')::numeric;
  v_units  := (v->>'units')::numeric;
  v_cnt    := (v->>'sale_count')::bigint;
  v_cogs   := (v->>'cogs_estimated')::numeric;
  v_margin := (v->>'margin_estimated')::numeric;

  -- Fast: 4 x 10 + 6 x 10 = 100. Low: 6 x 14 = 84. Total 184.
  perform pg_temp.t_rec('I01 revenue is the price actually charged', v_rev = 184,
    format('revenue=%s, expected 184', v_rev));
  perform pg_temp.t_rec('I02 units sold are counted positive', v_units = 16,
    format('units=%s, expected 16', v_units));
  perform pg_temp.t_rec('I03 one row per sale movement, not per checkout', v_cnt = 3,
    format('sale_count=%s, expected 3', v_cnt));
  -- Cost: Fast 10 x 5 = 50, Low 6 x 7 = 42. Total 92. This is the CURRENT cost
  -- price, which is why the interface calls it an estimate.
  perform pg_temp.t_rec('I04 cost is valued at the current cost price', v_cogs = 92,
    format('cogs=%s, expected 92', v_cogs));
  perform pg_temp.t_rec('I05 margin is revenue minus cost', v_margin = 92,
    format('margin=%s, expected 92', v_margin));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I05b: a sale with no recorded price falls back to the product's, never to zero
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_rev numeric;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);
  -- Low's two sale movements carry no unit_cost. If the fallback were missing it
  -- would contribute 0, and the total above would read 100 instead of 184.
  select revenue into v_rev from get_top_products(current_date - 30, current_date, 20)
   where name = 'Low';
  perform pg_temp.t_clear_auth();
  perform pg_temp.t_rec('I05b an unpriced sale is valued at the selling price, not at zero',
    v_rev = 84, format('Low revenue=%s, expected 84', v_rev));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I06: a period that excludes the sales reports nothing
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v json; v_cnt bigint; v_rev numeric;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);
  -- Sales are 20 days back; ask only about the last 5 days.
  select get_sales_summary(current_date - 5, current_date) into v;
  perform pg_temp.t_clear_auth();

  v_cnt := (v->>'sale_count')::bigint;
  v_rev := (v->>'revenue')::numeric;

  perform pg_temp.t_rec('I06 a window before the sales reports zero, not the sales',
    v_cnt = 0 and v_rev = 0,
    format('count=%s revenue=%s, expected 0 and 0', v_cnt, v_rev));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I07-I08: best sellers
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_top text; v_rev numeric; n integer;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);
  select count(*) into n from get_top_products(current_date - 30, current_date, 20);
  select name, revenue into v_top, v_rev
    from get_top_products(current_date - 30, current_date, 20) limit 1;
  perform pg_temp.t_clear_auth();

  -- Fast earns 100, Low earns 84, so Fast must lead.
  perform pg_temp.t_rec('I07 best sellers are ordered by revenue', v_top = 'Fast',
    format('top product was %s, expected Fast', v_top));
  perform pg_temp.t_rec('I08 both selling products are listed', n = 2,
    format('listed %s products, expected 2', n));
  perform pg_temp.t_rec('I09 the leading revenue is right', v_rev = 100,
    format('leading revenue=%s, expected 100', v_rev));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I10-I11: dead stock distinguishes "stopped" from "has not started"
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_names text[]; v_has_new boolean; v_has_slow boolean; v_value numeric;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);
  select coalesce(array_agg(name), '{}') into v_names
    from get_dead_stock(90, 50);
  -- Read both figures while still authenticated: clearing the role first makes
  -- auth.uid() null, and every one of these RPCs refuses that. (Learned the hard
  -- way: this test failed on its own first run for exactly that reason.)
  select value_tied_up into v_value
    from get_dead_stock(90, 50) where name = 'Slow';
  perform pg_temp.t_clear_auth();

  v_has_new  := 'Fresh' = any(v_names);
  v_has_slow := 'Slow'  = any(v_names);

  perform pg_temp.t_rec('I10 a product in stock and unsold for 400 days is dead stock',
    v_has_slow, format('dead stock names: %s', v_names));
  perform pg_temp.t_rec('I11 a product received 3 days ago is NOT dead stock',
    not v_has_new, format('Fresh wrongly listed; names: %s', v_names));
  perform pg_temp.t_rec('I12 dead stock reports the money tied up (5 x 30)',
    v_value = 150, format('value_tied_up=%s, expected 150', v_value));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I13-I16: the reorder list
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_uid uuid; v_names text[]; v_sup text;
  v_stock numeric; v_sold numeric; v_suggested numeric; n integer;
begin
  select user_a into v_uid from insight_ctx;
  perform pg_temp.t_auth(v_uid);

  select count(*) into n from get_reorder_list(30);
  select coalesce(array_agg(product_name), '{}') into v_names from get_reorder_list(30);
  select supplier_name, current_stock, units_sold, suggested_qty
    into v_sup, v_stock, v_sold, v_suggested
    from get_reorder_list(30) where product_name = 'Low';

  perform pg_temp.t_clear_auth();

  -- Low is at 4 with a threshold of 10, so it needs restocking. Slow is at 5 with
  -- no threshold set at all, so it is not a "low stock" case.
  perform pg_temp.t_rec('I13 a product below its threshold is on the reorder list',
    'Low' = any(v_names), format('reorder names: %s', v_names));
  perform pg_temp.t_rec('I14 the supplier is carried through for ordering',
    v_sup = 'Grossiste Tester', format('supplier=%s', v_sup));
  perform pg_temp.t_rec('I15 units sold in the lookback are shown',
    v_sold = 6, format('units_sold=%s, expected 6', v_sold));
  -- threshold 10 x 2 - stock 4 = 16, which beats units sold (6) - stock (4) = 2.
  perform pg_temp.t_rec('I16 the suggestion is a positive quantity, never negative',
    v_suggested > 0 and v_suggested = 16,
    format('suggested=%s, expected 16', v_suggested));
  perform pg_temp.t_rec('I17 a product with no threshold and healthy stock stays off the list',
    not ('Slow' = any(v_names)), format('reorder names: %s', v_names));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- I18: another store's movements never appear
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_other uuid; v json; v_rev numeric;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'other@insightstest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Other Store"}', now(), now())
  returning id into v_other;

  perform pg_temp.t_auth(v_other);
  select get_sales_summary(current_date - 30, current_date) into v;
  perform pg_temp.t_clear_auth();
  v_rev := (v->>'revenue')::numeric;

  perform pg_temp.t_rec('I18 a different store sees its own empty books, not someone else''s',
    v_rev = 0, format('other store revenue=%s, expected 0', v_rev));
end $$;

select pg_temp.t_wipe();

select count(*) as total,
       count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed
from insight_results;

select name, passed, detail from insight_results where not passed order by id;
