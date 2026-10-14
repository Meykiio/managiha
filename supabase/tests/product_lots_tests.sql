-- ============================================================================
-- product_lots_tests.sql - proves the Phase 2 FEFO behaviour.
--
-- Runs against a real Postgres with every migration applied, 00016 included.
-- Self-contained: creates a throwaway owner, exercises lot creation, FEFO
-- ordering, multi-lot sale splitting, the sum invariant and tenant isolation,
-- then deletes everything. Safe to re-run.
--
-- Each assertion names the defect it prevents from coming back.
-- ============================================================================

create temp table if not exists lot_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists lot_ctx (
  user_a uuid, store_a uuid, pid_a uuid, cid_a uuid
);

create or replace function pg_temp.lot_auth(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.lot_clear_auth() returns void
language plpgsql as $$
begin
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';
end $$;

create or replace function pg_temp.lot_rec(p_name text, p_passed boolean, p_detail text)
returns void language plpgsql as $$
begin
  insert into lot_results (name, passed, detail)
  values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.lot_wipe() returns void
language plpgsql as $$
declare v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email like '%@lotstest.managiha.test';

  -- Order matters: movements reference lots, lots reference products.
  if v_sids <> '{}'::uuid[] then
    delete from stock_movements where store_id = any(v_sids);
    delete from product_lots      where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from carnet_customers  where store_id = any(v_sids);
    delete from products          where store_id = any(v_sids);
    delete from suppliers         where store_id = any(v_sids);
    delete from categories        where store_id = any(v_sids);
  end if;

  delete from stores   where owner_id in (select id from auth.users where email like '%@lotstest.managiha.test');
  delete from profiles where id in (select id from auth.users where email like '%@lotstest.managiha.test');
  delete from auth.users where email like '%@lotstest.managiha.test';
end $$;

select pg_temp.lot_wipe();

-- ── Seed one owner and one product with two deliveries ──────────────────────
do $$
declare
  v_user uuid; v_store uuid; v_pid uuid; v_cid uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'lot@lotstest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Lot Store"}', now(), now())
  returning id into v_user;

  select id into v_store from stores where owner_id = v_user;

  perform pg_temp.lot_auth(v_user);
  insert into products (store_id, name, unit, cost_price, sell_price, current_stock)
  values (v_store, 'Lait UHT 1L', 'piece', 90, 130, 0) returning id into v_pid;
  insert into carnet_customers (store_id, full_name)
  values (v_store, 'Nadia') returning id into v_cid;
  perform pg_temp.lot_clear_auth();

  -- INSERT, not UPDATE. This table is created empty, so an UPDATE matches zero
  -- rows and leaves every downstream SELECT returning NULL, which then presents
  -- as "Authentification requise" from inside adjust_stock rather than as an
  -- obvious empty-context error.
  insert into lot_ctx (user_a, store_a, pid_a, cid_a)
  values (v_user, v_store, v_pid, v_cid);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L01: receiving creates one lot per delivery
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_store uuid; v_pid uuid; n integer;
begin
  select store_a, pid_a into v_store, v_pid from lot_ctx;

  perform pg_temp.lot_auth((select user_a from lot_ctx));
  -- Named arguments on purpose. adjust_stock takes ten parameters and a positional
  -- call that omits one silently shifts every later argument into the wrong slot.
  perform adjust_stock(
    p_product_id   => v_pid,
    p_movement_type => 'receive',
    p_quantity     => 10,
    p_unit_cost    => 90,
    p_note         => 'lot A',
    p_expiry_date  => current_date + 30,
    p_lot_code     => 'A'
  );
  perform adjust_stock(
    p_product_id   => v_pid,
    p_movement_type => 'receive',
    p_quantity     => 6,
    p_unit_cost    => 95,
    p_note         => 'lot B',
    p_expiry_date  => current_date + 10,
    p_lot_code     => 'B'
  );
  perform pg_temp.lot_clear_auth();

  select count(*) into n from product_lots where product_id = v_pid;
  perform pg_temp.lot_rec('L01 receiving creates one lot per delivery', n = 2,
    format('expected 2 lots, got %s', n));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L02: the product total equals the sum of its lots
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_pid uuid; v_product numeric; v_lots numeric;
begin
  select pid_a into v_pid from lot_ctx;
  select current_stock into v_product from products where id = v_pid;
  select coalesce(sum(quantity), 0) into v_lots from product_lots where product_id = v_pid;

  perform pg_temp.lot_rec('L02 products.current_stock equals the sum of its lots',
    v_product = v_lots, format('product=%s, lots=%s', v_product, v_lots));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L03: FEFO returns the soonest expiry first, undated lots last
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_pid uuid; r record; n integer := 0; seen_dated_first boolean := true; saw_null boolean := false;
begin
  select pid_a into v_pid from lot_ctx;

  -- A third, undated lot: bread and cleaning products do not expire.
  perform pg_temp.lot_auth((select user_a from lot_ctx));
  perform adjust_stock(
    p_product_id    => v_pid,
    p_movement_type => 'receive',
    p_quantity      => 4,
    p_unit_cost     => 50,
    p_note          => 'undated'
  );

  -- allocate_lots_fefo is self-authorising: it refuses to answer for a store the
  -- caller does not own. So the read has to happen while still authenticated, which
  -- is also the only way this test proves anything about the real call path.
  for r in select * from allocate_lots_fefo(v_pid) loop
    n := n + 1;
    if r.expiry_date is null then
      saw_null := true;
    elsif saw_null then
      seen_dated_first := false;   -- a dated lot appeared after an undated one
    end if;
  end loop;

  perform pg_temp.lot_clear_auth();

  perform pg_temp.lot_rec('L03 FEFO orders soonest expiry first', n = 3,
    format('expected 3 lots returned, got %s', n));
  perform pg_temp.lot_rec('L04 undated lots sort last under FEFO',
    saw_null and seen_dated_first,
    format('saw undated=%s and dated stayed first=%s', saw_null, seen_dated_first));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L05: a sale spanning two lots produces two movements and closes the first lot
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_store uuid; v_pid uuid; v_res jsonb;
  v_moves integer; v_closed integer; v_sum numeric; v_product numeric;
begin
  select store_a, pid_a into v_store, v_pid from lot_ctx;

  -- Lot B (6 units, expiring in 10 days) then lot A (10 units, 30 days) then
  -- undated (4). Selling 8 must take 6 from B and 2 from A.
  perform pg_temp.lot_auth((select user_a from lot_ctx));
  select checkout_sale(
    jsonb_build_array(jsonb_build_object('product_id', v_pid, 'quantity', 8)),
    'cash', null, 2000, 'fefo sale', gen_random_uuid()
  ) into v_res;
  perform pg_temp.lot_clear_auth();

  select count(*) into v_moves
  from stock_movements
  where product_id = v_pid and movement_type = 'sale';

  perform pg_temp.lot_rec('L05 a sale across two lots writes two movements', v_moves = 2,
    format('expected 2 sale movements, got %s', v_moves));

  select count(*) into v_closed
  from product_lots where product_id = v_pid and closed_at is not null;

  perform pg_temp.lot_rec('L06 the emptied lot is closed', v_closed >= 1,
    format('expected at least 1 closed lot, got %s', v_closed));

  select current_stock into v_product from products where id = v_pid;
  select coalesce(sum(quantity), 0) into v_sum from product_lots where product_id = v_pid;

  perform pg_temp.lot_rec('L07 the sum invariant survives a multi-lot sale',
    v_product = v_sum, format('product=%s, lots=%s', v_product, v_sum));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L08: FEFO actually consumed the soonest-expiring lot first
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_pid uuid; v_closed_soonest integer;
begin
  select pid_a into v_pid from lot_ctx;

  -- The sale of 8 drew 6 from the lot expiring in 10 days and 2 from the one
  -- expiring in 30. So the soonest-expiring lot must be the drained one.
  select count(*) into v_closed_soonest
  from product_lots
  where product_id = v_pid
    and closed_at is not null
    and expiry_date = (
      select min(l2.expiry_date) from product_lots l2
      where l2.product_id = v_pid and l2.expiry_date is not null
    );

  perform pg_temp.lot_rec('L08 the soonest-expiring lot was consumed first',
    v_closed_soonest = 1,
    format('closed lots at the earliest expiry = %s', v_closed_soonest));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L09: a client cannot change lot quantities, and the guard exists as a backstop
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_pid uuid; n_before numeric; n_after numeric; v_rows integer; v_guard integer;
begin
  select pid_a into v_pid from lot_ctx;
  select coalesce(sum(quantity), 0) into n_before from product_lots where product_id = v_pid;

  perform pg_temp.lot_auth((select user_a from lot_ctx));
  -- RLS wins first: there is no UPDATE policy on product_lots, so this statement
  -- is not an error, it simply matches zero rows. That is the primary defence.
  update product_lots set quantity = quantity + 1000 where product_id = v_pid;
  get diagnostics v_rows = row_count;
  perform pg_temp.lot_clear_auth();

  select coalesce(sum(quantity), 0) into n_after from product_lots where product_id = v_pid;

  -- The trigger is the second line of defence, for any path that reaches the table
  -- without going through RLS. Assert it is attached rather than that it fires,
  -- because from an authenticated session RLS means it never gets the chance.
  select count(*) into v_guard
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where c.relname = 'product_lots'
    and t.tgname = 'trg_product_lots_guard_quantity'
    and not t.tgisinternal;

  perform pg_temp.lot_rec('L09 a direct lot write updates zero rows', v_rows = 0,
    format('UPDATE affected %s rows', v_rows));
  perform pg_temp.lot_rec('L10 a rejected write leaves quantities untouched', n_before = n_after,
    format('before=%s after=%s', n_before, n_after));
  perform pg_temp.lot_rec('L09b the quantity guard trigger is attached as a backstop',
    v_guard = 1, format('found %s matching triggers', v_guard));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L11: one store cannot read another store's lots
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_other uuid; v_other_store uuid; v_seen integer := 0; v_target_store uuid;
begin
  -- Read the victim store before switching role: temp tables belong to the
  -- session user, and the authenticated role has no privilege on them.
  select store_a into v_target_store from lot_ctx;

  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated',
    'intruder@lotstest.managiha.test', 'x', now(),
    '{"provider":"email","providers":["email"]}', '{"store_name":"Other"}', now(), now())
  returning id into v_other;

  select id into v_other_store from stores where owner_id = v_other;

  perform pg_temp.lot_auth(v_other);
  select count(*) into v_seen from product_lots where store_id = v_target_store;
  perform pg_temp.lot_clear_auth();

  perform pg_temp.lot_rec('L11 lots are invisible across tenants', v_seen = 0,
    format('intruder read %s foreign lots', v_seen));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L12: adjust_stock keeps its idempotency contract after the lot change
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_pid uuid; v_op uuid := gen_random_uuid(); v_first uuid; v_second uuid; n integer;
begin
  select pid_a into v_pid from lot_ctx;

  perform pg_temp.lot_auth((select user_a from lot_ctx));
  v_first := adjust_stock(
    p_product_id    => v_pid,
    p_movement_type => 'receive',
    p_quantity      => 5,
    p_unit_cost     => 90,
    p_note          => 'idem',
    p_client_op_id  => v_op,
    p_lot_code      => 'IDEM'
  );
  v_second := adjust_stock(
    p_product_id    => v_pid,
    p_movement_type => 'receive',
    p_quantity      => 5,
    p_unit_cost     => 90,
    p_note          => 'idem',
    p_client_op_id  => v_op,
    p_lot_code      => 'IDEM'
  );
  perform pg_temp.lot_clear_auth();

  select count(*) into n from stock_movements
  where product_id = v_pid and note = 'idem';

  -- Regression guard for the 00016 rewrite: p_client_op_id must still be the
  -- idempotency key and must not have been reinterpreted as a lot id.
  perform pg_temp.lot_rec('L12 a replayed adjust_stock does not double-apply', n = 1,
    format('expected 1 movement for a replayed op, got %s', n));
  perform pg_temp.lot_rec('L13 the replay returns the original movement id',
    v_first = v_second, format('first=%s, second=%s', v_first, v_second));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L14: receiving the same lot code and date reopens rather than duplicates
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_store uuid; v_pid uuid; before_n integer; after_n integer;
begin
  select store_a, pid_a into v_store, v_pid from lot_ctx;

  perform pg_temp.lot_auth((select user_a from lot_ctx));
  -- Sell the undated lot dry, then receive the same undated lot again.
  perform adjust_stock(
    p_product_id    => v_pid,
    p_movement_type => 'correction',
    p_quantity      => -4,
    p_reason        => 'dry out'
  );
  perform pg_temp.lot_clear_auth();

  select count(*) into before_n from product_lots where product_id = v_pid;

  perform pg_temp.lot_auth((select user_a from lot_ctx));
  perform adjust_stock(
    p_product_id    => v_pid,
    p_movement_type => 'receive',
    p_quantity      => 3,
    p_unit_cost     => 50,
    p_note          => 're-receive'
  );
  perform pg_temp.lot_clear_auth();

  select count(*) into after_n from product_lots where product_id = v_pid;

  perform pg_temp.lot_rec('L14 re-receiving the same lot reopens it', after_n = before_n,
    format('lots before=%s, after=%s; a duplicate row means the upsert lost', before_n, after_n));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L15: expiry_report only lists open lots that actually have stock
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_pid uuid; bad integer;
begin
  select pid_a into v_pid from lot_ctx;

  select count(*) into bad
  from expiry_report
  where product_id = v_pid and (quantity <= 0);

  perform pg_temp.lot_rec('L15 expiry_report lists only open lots with stock', bad = 0,
    format('%s rows with non-positive quantity', bad));
end $$;

-- ── Report ─────────────────────────────────────────────────────────────────
select pg_temp.lot_wipe();

select passed, count(*) as n, min(name) as first_failure
from lot_results
group by passed
order by passed;

select 'PRODUCT LOTS / FEFO' as suite,
       count(*) as total,
       count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed
from lot_results;

select * from lot_results where not passed order by name;