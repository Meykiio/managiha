-- ============================================================================
-- trends_rpc_tests.sql - proves get_dashboard_trends() reconstructs history
-- correctly.
--
-- The function derives past stock value by subtracting later movements from the
-- current figure, which is the kind of arithmetic that looks right and is off by
-- one event. These assertions pin the boundaries.
--
-- Self-contained and self-cleaning. Each assertion names what it protects.
-- ============================================================================

create temp table if not exists trend_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists trend_ctx (
  user_a uuid, store_a uuid, pid_a uuid, cid_a uuid
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
  insert into trend_results (name, passed, detail)
  values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.t_wipe() returns void
language plpgsql as $$
declare v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email like '%@trendstest.managiha.test';

  if v_sids <> '{}'::uuid[] then
    delete from stock_movements where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from product_lots where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from carnet_customers where store_id = any(v_sids);
  end if;

  delete from stores where owner_id in (select id from auth.users where email like '%@trendstest.managiha.test');
  delete from profiles where id in (select id from auth.users where email like '%@trendstest.managiha.test');
  delete from auth.users where email like '%@trendstest.managiha.test';
end $$;

select pg_temp.t_wipe();

-- ── Seed: opening balance 6 days back, a sale 3 days back ────────────────────
do $$
declare v_user uuid; v_store uuid; v_pid uuid; v_cid uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'trend@trendstest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Trend Store"}', now(), now())
  returning id into v_user;

  select id into v_store from stores where owner_id = v_user;

  perform pg_temp.t_auth(v_user);
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_store, 'Trend Coke', 'piece', 10, 20, 0) returning id into v_pid;
  insert into carnet_customers (store_id, full_name)
  values (v_store, 'Trend Ali') returning id into v_cid;
  perform adjust_stock(p_product_id => v_pid, p_movement_type => 'opening_balance',
    p_quantity => 100, p_unit_cost => 10);
  perform adjust_stock(p_product_id => v_pid, p_movement_type => 'sale',
    p_quantity => 10, p_reason => 'backdated sale');
  perform record_carnet_transaction(p_customer_id => v_cid, p_type => 'credit', p_amount => 500);
  perform pg_temp.t_clear_auth();

  -- Backdate. The opening balance must precede the sale or the history is
  -- temporally impossible and the arithmetic below means nothing.
  update stock_movements set created_at = now() - interval '6 days'
   where product_id = v_pid and movement_type = 'opening_balance';
  update stock_movements set created_at = now() - interval '3 days'
   where product_id = v_pid and movement_type = 'sale';
  update carnet_transactions set created_at = now() - interval '3 days'
   where customer_id = v_cid;

  insert into trend_ctx (user_a, store_a, pid_a, cid_a) values (v_user, v_store, v_pid, v_cid);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y01: the series has the requested length
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; n integer;
begin
  select user_a into v_uid from trend_ctx;
  perform pg_temp.t_auth(v_uid);
  select count(*) into n from get_dashboard_trends(7);
  perform pg_temp.t_clear_auth();
  perform pg_temp.t_rec('Y01 returns one row per requested day', n = 7,
    format('asked 7, got %s', n));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y02: stock value is reconstructed, not restated
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_before numeric; v_after numeric; v_today numeric;
begin
  select user_a into v_uid from trend_ctx;
  perform pg_temp.t_auth(v_uid);

  -- 100 units at cost 10 before the sale, 90 units after. The sale ran 3 days
  -- back, so the day 4 days back must still read 1000.
  select stock_value into v_before from get_dashboard_trends(7) where day = current_date - 4;
  select stock_value into v_after  from get_dashboard_trends(7) where day = current_date - 2;
  select stock_value into v_today  from get_dashboard_trends(7) where day = current_date;

  perform pg_temp.t_clear_auth();

  perform pg_temp.t_rec('Y02 stock value before the sale is 1000', v_before = 1000,
    format('day-4 had %s, expected 1000', v_before));
  perform pg_temp.t_rec('Y03 stock value after the sale is 900', v_after = 900,
    format('day-2 had %s, expected 900', v_after));
  perform pg_temp.t_rec('Y04 today matches the current figure', v_today = 900,
    format('today had %s, expected 900', v_today));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y05: the movement count lands on the right day
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_sale_day bigint; v_quiet_day bigint; v_sales numeric;
begin
  select user_a into v_uid from trend_ctx;
  perform pg_temp.t_auth(v_uid);

  select movement_count, sales_value into v_sale_day, v_sales
    from get_dashboard_trends(7) where day = current_date - 3;
  select movement_count into v_quiet_day
    from get_dashboard_trends(7) where day = current_date - 2;

  perform pg_temp.t_clear_auth();

  perform pg_temp.t_rec('Y05 movement_count counts only that day', v_sale_day = 1 and v_quiet_day = 0,
    format('sale day=%s, quiet day=%s', v_sale_day, v_quiet_day));
  perform pg_temp.t_rec('Y06 sales_value uses sell_price, not cost', v_sales = 200,
    format('sales=%s, expected 10 units x 20', v_sales));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y07: carnet outstanding accumulates from the transaction date, not before
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_before numeric; v_on numeric;
begin
  select user_a into v_uid from trend_ctx;
  perform pg_temp.t_auth(v_uid);
  select carnet_outstanding into v_before from get_dashboard_trends(7) where day = current_date - 4;
  select carnet_outstanding into v_on from get_dashboard_trends(7) where day = current_date - 3;
  perform pg_temp.t_clear_auth();

  perform pg_temp.t_rec('Y07 carnet is zero before the credit was given', v_before = 0,
    format('day-4 had %s, expected 0', v_before));
  perform pg_temp.t_rec('Y08 carnet includes the credit from its own day', v_on = 500,
    format('day-3 had %s, expected 500', v_on));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y09: the window is clamped, so a caller cannot ask for a decade
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; n integer;
begin
  select user_a into v_uid from trend_ctx;
  perform pg_temp.t_auth(v_uid);
  select count(*) into n from get_dashboard_trends(5000);
  perform pg_temp.t_clear_auth();
  perform pg_temp.t_rec('Y09 an oversized window is clamped to 90 days', n = 90,
    format('asked 5000 days, got %s', n));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y10: anon cannot execute it
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_anon boolean;
begin
  v_anon := has_function_privilege('anon', 'public.get_dashboard_trends(integer)', 'EXECUTE');
  perform pg_temp.t_rec('Y10 anon cannot execute get_dashboard_trends', v_anon is false,
    'anon_execute=' || coalesce(v_anon::text, 'null'));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Y11: a store with no products still gets a full zero series
--
-- The first version of this function used an inner join on products, so a store
-- that had not added anything got an empty result rather than a flat line and the
-- sparkline rendered nothing. This assertion is why the join is a left join.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_other uuid; v_total numeric; v_rows integer;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'other@trendstest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Other Store"}', now(), now())
  returning id into v_other;

  perform pg_temp.t_auth(v_other);
  select count(*) into v_rows from get_dashboard_trends(7);
  select coalesce(max(stock_value), -1) into v_total from get_dashboard_trends(7);
  perform pg_temp.t_clear_auth();

  perform pg_temp.t_rec('Y11 an empty store still gets a full zero series',
    v_rows = 7 and v_total = 0,
    format('rows=%s max_stock_value=%s (expected 7 and 0)', v_rows, v_total));
end $$;

select pg_temp.t_wipe();

select count(*) as total,
       count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed
from trend_results;

select name, passed, detail from trend_results where not passed order by id;
