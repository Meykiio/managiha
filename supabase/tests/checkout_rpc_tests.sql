-- ============================================================================
-- checkout_rpc_tests.sql - proves the Phase 1 fixes.
--
-- Runs against a real Postgres with the full schema applied. Self-contained:
-- creates two throwaway owners, exercises checkout_sale and the idempotency
-- ledger, then deletes everything. Safe to re-run.
--
-- Each assertion names the defect it prevents from coming back.
-- ============================================================================

create temp table if not exists checkout_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists ctx (
  user_a uuid, store_a uuid, store_b uuid,
  pid_a uuid, pid_b uuid, cid_a uuid, cid_b uuid
);

create or replace function pg_temp.set_auth(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.clear_auth() returns void
language plpgsql as $$
begin
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';
end $$;

create or replace function pg_temp.rec(p_name text, p_passed boolean, p_detail text)
returns void language plpgsql as $$
begin
  insert into checkout_results (name, passed, detail)
  values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.wipe() returns void
language plpgsql as $$
declare v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email like '%@managiha.test';

  if v_sids <> '{}'::uuid[] then
    delete from stock_movements where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from carnet_customers where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from suppliers where store_id = any(v_sids);
    delete from categories where store_id = any(v_sids);
  end if;

  delete from stores where owner_id in (select id from auth.users where email like '%@managiha.test');
  delete from profiles where id in (select id from auth.users where email like '%@managiha.test');
  delete from auth.users where email like '%@managiha.test';
end $$;

select pg_temp.wipe();

-- ── Seed two stores, two products, two customers ───────────────────────────
do $$
declare v_a uuid; v_b uuid; v_sid_a uuid; v_sid_b uuid;
        v_pid_a uuid; v_pid_b uuid; v_cid_a uuid; v_cid_b uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'co-a@managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Co A"}', now(), now())
  returning id into v_a;

  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'co-b@managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Co B"}', now(), now())
  returning id into v_b;

  -- The handle_new_user trigger on auth.users creates each store for us.
  select id into v_sid_a from stores where owner_id = v_a;
  select id into v_sid_b from stores where owner_id = v_b;

  -- Stock is opened through adjust_stock, not by setting current_stock directly.
  -- Since 00016 a sale consumes lots, so a product whose stock exists only as a
  -- current_stock number has nothing for FEFO to draw from and every checkout is
  -- correctly rejected. Opening balance creates the lot and the movement together.
  perform pg_temp.set_auth(v_a);
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_sid_a, 'Coca 1L', 'piece', 100, 150, 0) returning id into v_pid_a;
  perform adjust_stock(
    p_product_id    => v_pid_a,
    p_movement_type => 'opening_balance',
    p_quantity      => 20,
    p_unit_cost     => 100
  );
  insert into carnet_customers (store_id, full_name)
  values (v_sid_a, 'Ali') returning id into v_cid_a;
  perform pg_temp.clear_auth();

  perform pg_temp.set_auth(v_b);
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_sid_b, 'Produit victime', 'piece', 1000, 2000, 0) returning id into v_pid_b;
  perform adjust_stock(
    p_product_id    => v_pid_b,
    p_movement_type => 'opening_balance',
    p_quantity      => 10,
    p_unit_cost     => 1000
  );
  insert into carnet_customers (store_id, full_name)
  values (v_sid_b, 'Victime') returning id into v_cid_b;
  perform pg_temp.clear_auth();

  -- INSERT, not UPDATE. The table is created empty, so an UPDATE matches zero
  -- rows and every later SELECT returns NULL, which surfaces as a misleading
  -- "Authentification requise" from inside a write RPC instead of an empty-context
  -- error at the point of the mistake.
  insert into ctx
    (user_a, store_a, store_b, pid_a, pid_b, cid_a, cid_b)
  values
    (v_a, v_sid_a, v_sid_b, v_pid_a, v_pid_b, v_cid_a, v_cid_b);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C01 THE EXPLOIT: own product first, victim's product second.
-- Before 00013 this decremented store B's stock. Must now raise.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_a_pid uuid; v_b_pid uuid; v_stock numeric; err text;
begin
  select user_a, pid_a, pid_b into v_a, v_a_pid, v_b_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    perform checkout_sale(
      jsonb_build_array(
        jsonb_build_object('product_id', v_a_pid, 'quantity', 1),
        jsonb_build_object('product_id', v_b_pid, 'quantity', 1)
      ),
      'cash', null, 100000, null, gen_random_uuid());
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_b_pid;

  perform pg_temp.rec('C01 cross-store cart line rejected', err is not null, coalesce(err, 'NO ERROR RAISED'));
  perform pg_temp.rec('C01b victim stock untouched', v_stock = 10, 'stock=' || v_stock);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C02 duplicate lines are aggregated before validation.
-- Two lines of 11 against stock 20 sum to 22, which must be rejected. Validating
-- per line instead of per product would pass each 11 on its own and drive stock
-- negative on the second decrement.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    perform checkout_sale(
      jsonb_build_array(
        jsonb_build_object('product_id', v_pid, 'quantity', 11),
        jsonb_build_object('product_id', v_pid, 'quantity', 11)
      ),
      'cash', null, 100000, null, gen_random_uuid());
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_pid;

  perform pg_temp.rec('C02 duplicate lines cannot drive stock negative',
    err is not null and v_stock = 20, coalesce(err, 'stock=' || v_stock));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C03 the stale-balance bug.
-- Before 00013 a credit sale inserted a transaction row and left the balance
-- untouched, so "who owes what" was silently wrong forever.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_cid uuid; v_balance numeric; v_total numeric; err text;
begin
  select user_a, pid_a, cid_a into v_a, v_pid, v_cid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    select (checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 2)),
      'credit', v_cid, null, null, gen_random_uuid())) ->> 'total'
    into v_total;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select balance into v_balance from carnet_customers where id = v_cid;

  perform pg_temp.rec('C03 credit checkout updates the customer balance',
    err is null and v_balance = 300,
    coalesce(err, 'balance=' || coalesce(v_balance::text, 'null') || ' total=' || coalesce(v_total::text, 'null')));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C04 credit onto another store's customer. Never verified before 00013.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_b_cid uuid; v_balance numeric; err text;
begin
  select user_a, pid_a, cid_b into v_a, v_pid, v_b_cid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    perform checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 1)),
      'credit', v_b_cid, null, null, gen_random_uuid());
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select balance into v_balance from carnet_customers where id = v_b_cid;

  perform pg_temp.rec('C04 credit onto another store customer rejected',
    err is not null and v_balance = 0,
    coalesce(err, 'NO ERROR, victim balance=' || coalesce(v_balance::text, 'null')));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C05 the browser cannot set the price. Before 00013 unit_price came from the
-- client and drove the total. sell_price is 150, so 2 units must total 300
-- even though the payload claims 1 each.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_total numeric; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    select (checkout_sale(
      jsonb_build_array(
        jsonb_build_object('product_id', v_pid, 'quantity', 2, 'unit_price', 1)
      ),
      'cash', null, 100000, null, gen_random_uuid())) ->> 'total'
    into v_total;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  perform pg_temp.rec('C05 client-supplied price is ignored',
    err is null and v_total = 300, coalesce(err, 'total=' || coalesce(v_total::text, 'null')));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C06 a replayed p_client_op_id must not sell twice.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_op uuid; v_stock numeric; v_moves int;
        v_r1 jsonb; v_r2 jsonb; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;
  v_op := gen_random_uuid();

  perform pg_temp.set_auth(v_a);
  begin
    v_r1 := checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 3)),
      'cash', null, 100000, null, v_op);
    v_r2 := checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 3)),
      'cash', null, 100000, null, v_op);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_pid;
  select count(*) into v_moves from stock_movements
  where product_id = v_pid and movement_type = 'sale' and quantity = -3;

  perform pg_temp.rec('C06 replayed op id is a no-op',
    err is null and v_r1 = v_r2 and v_stock = 13 and v_moves = 1,
    coalesce(err, 'stock=' || v_stock || ' sale_movements=' || v_moves));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C07 p_client_op_id is mandatory, so the exploit cannot be simply skipped.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    perform checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 1)),
      'cash', null, 100000, null, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('C07 checkout without an op id is rejected',
    err is not null and v_stock = 13, coalesce(err, 'NO ERROR, stock=' || v_stock));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C08 cash change is computed from the authoritative total.
-- Stock is 13, sell_price 150. Selling 2 => total 300, paying 500 => 200 back.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_change numeric; v_total numeric; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    select r ->> 'total', r ->> 'change' into v_total, v_change
    from checkout_sale(
      jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 2)),
      'cash', null, 500, null, gen_random_uuid()) r;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  perform pg_temp.rec('C08 cash change computed from the server total',
    err is null and v_total = 300 and v_change = 200,
    coalesce(err, 'total=' || coalesce(v_total::text, 'null') || ' change=' || coalesce(v_change::text, 'null')));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C09 an empty or non-array cart is rejected before anything is written.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err1 text; err2 text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin perform checkout_sale('[]'::jsonb, 'cash', null, 100, null, gen_random_uuid());
  exception when others then err1 := sqlerrm; end;
  begin perform checkout_sale('{"product_id":"x"}'::jsonb, 'cash', null, 100, null, gen_random_uuid());
  exception when others then err2 := sqlerrm; end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('C09 empty and non-array carts rejected',
    err1 is not null and err2 is not null and v_stock = 11,
    coalesce(err1 || ' | ' || err2, 'NO ERROR, stock=' || v_stock));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C10 anon must not be able to reach checkout_sale at all.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_exists int; v_anon_exec boolean;
begin
  -- Check existence first: has_function_privilege raises rather than returning
  -- false when the function is absent, which would abort the whole block.
  select count(*) into v_exists from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'checkout_sale';

  if v_exists = 1 then
    v_anon_exec := has_function_privilege(
      'anon', 'public.checkout_sale(jsonb,text,uuid,numeric,text,uuid)', 'EXECUTE');
  else
    v_anon_exec := true;
  end if;

  perform pg_temp.rec('C10 anon cannot execute checkout_sale',
    v_exists = 1 and v_anon_exec is false,
    'exists=' || v_exists || ' anon_execute=' || coalesce(v_anon_exec::text, 'null'));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C11 the RLS helper moved out of the exposed schema in 00014.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n_public int; n_private int; n_trig int;
begin
  select count(*) into n_public from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'is_store_owner';

  select count(*) into n_private from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'private' and p.proname = 'is_store_owner';

  select count(*) into n_trig from pg_trigger
  where tgname in ('trg_products_guard_stock', 'trg_carnet_guard_balance')
    and not tgisinternal;

  perform pg_temp.rec('C11 RLS helper is in private, not public',
    n_public = 0 and n_private = 1, 'public=' || n_public || ' private=' || n_private);

  perform pg_temp.rec('C12 guard triggers still installed', n_trig = 2, 'triggers=' || n_trig);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C13 the guard trigger still blocks a direct current_stock write after the
-- move to private (00014). This is the RPC-only invariant.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select user_a, pid_a into v_a, v_pid from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    update products set current_stock = 9999 where id = v_pid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('C13 direct current_stock write still blocked',
    err is not null and v_stock = 11, coalesce(err, 'stock=' || v_stock));
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C14 cross-store reads still blocked after the policy rewrite in 00015.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; v_b_pid uuid; n int;
begin
  select user_a, pid_b into v_a, v_b_pid from ctx;

  perform pg_temp.set_auth(v_a);
  select count(*) into n from products where id = v_b_pid;
  perform pg_temp.clear_auth();

  perform pg_temp.rec('C14 cross-store SELECT still blocked after rewrite',
    n = 0, 'count=' || n);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C15 the idempotency ledger is unreachable by clients (zero RLS policies).
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_a uuid; n int; err text;
begin
  select user_a into v_a from ctx;

  perform pg_temp.set_auth(v_a);
  begin
    select count(*) into n from idempotency_keys;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();

  perform pg_temp.rec('C15 idempotency ledger not client-readable',
    err is not null or n = 0, coalesce(err, 'rows visible=' || n));
end $$;

select pg_temp.wipe();

select name, passed, detail from checkout_results order by id;

do $$
declare v_fail int; v_total int;
begin
  select count(*), count(*) filter (where not passed) into v_total, v_fail from checkout_results;
  if v_fail > 0 then
    raise exception 'CHECKOUT TESTS: % of % FAILED, see results above', v_fail, v_total;
  else
    raise notice 'CHECKOUT TESTS: all % passed', v_total;
  end if;
end $$;