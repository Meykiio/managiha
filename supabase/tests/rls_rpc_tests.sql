create temp table if not exists test_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists test_ctx (
  a uuid, b uuid, sid_a uuid, sid_b uuid, pid uuid, pid_b uuid, cid uuid
);

create or replace function pg_temp.set_auth(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format(
    'set local request.jwt.claims = %L',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text
  );
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
  insert into test_results (name, passed, detail) values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.wipe_test_data() returns void
language plpgsql as $$
declare
  v_sids uuid[];
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

select pg_temp.wipe_test_data();

do $$
declare v_a uuid; v_b uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'test-a@managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Magasin A"}', now(), now())
  returning id into v_a;

  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'test-b@managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Magasin B"}', now(), now())
  returning id into v_b;

  insert into test_ctx (a, b, sid_a, sid_b)
  values (v_a, v_b,
    (select id from stores where owner_id = v_a),
    (select id from stores where owner_id = v_b));
end $$;

do $$
declare v_a uuid; v_sid uuid; n int;
begin
  select a, sid_a into v_a, v_sid from test_ctx;
  perform pg_temp.set_auth(v_a);
  select count(*) into n from stores where id = v_sid;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T01 owner sees own store', n = 1, 'count=' || n);
end $$;

do $$
declare v_a uuid; v_sid_b uuid; n int;
begin
  select a, sid_b into v_a, v_sid_b from test_ctx;
  perform pg_temp.set_auth(v_a);
  select count(*) into n from stores where id = v_sid_b;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T02 cross-store store SELECT blocked', n = 0, 'count=' || n);
end $$;

do $$
declare v_a uuid; v_sid uuid; v_pid uuid; err text;
begin
  select a, sid_a into v_a, v_sid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    insert into products (store_id, name, unit, cost_price, sell_price)
    values (v_sid, 'Coca 1L', 'piece', 100, 150)
    returning id into v_pid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  update test_ctx set pid = v_pid where a = v_a;
  perform pg_temp.rec('T03 owner can insert product in own store',
    err is null and v_pid is not null, coalesce(err, 'pid=' || v_pid));
end $$;

do $$
declare v_a uuid; v_sid_b uuid; err text;
begin
  select a, sid_b into v_a, v_sid_b from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    insert into products (store_id, name) values (v_sid_b, 'Hack attempt');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T03b cross-store product INSERT rejected', err is not null, coalesce(err, 'insert succeeded!'));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; v_qty numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'receive', 10, 100, null, 'test receive');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  select quantity into v_qty from stock_movements where product_id = v_pid and movement_type = 'receive';
  perform pg_temp.rec('T04 receive RPC: stock 0→10 + movement +10',
    err is null and v_stock = 10 and v_qty = 10,
    coalesce(err, 'stock=' || v_stock || ' movement=' || v_qty));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; v_qty numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'damage', 3, null, 'casse', null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  select quantity into v_qty from stock_movements where product_id = v_pid and movement_type = 'damage';
  perform pg_temp.rec('T05 damage RPC: stock 10→7 + movement -3',
    err is null and v_stock = 7 and v_qty = -3,
    coalesce(err, 'stock=' || v_stock || ' movement=' || v_qty));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; v_qty numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'count_adjustment', 12, null, 'comptage', null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  select quantity into v_qty from stock_movements where product_id = v_pid and movement_type = 'count_adjustment';
  perform pg_temp.rec('T06 count RPC: new qty 12 → delta +5 stored',
    err is null and v_stock = 12 and v_qty = 5,
    coalesce(err, 'stock=' || v_stock || ' delta=' || v_qty));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'sale', 999, null, null, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('T07 RPC refuses negative resulting stock',
    err is not null and v_stock = 12, coalesce(err, 'sale succeeded!'));
end $$;

do $$
declare v_a uuid; v_pid uuid; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'not_a_type', 1, null, null, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T08 RPC refuses invalid movement type', err is not null, coalesce(err, 'accepted!'));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'receive', 0, null, null, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('T08b RPC refuses zero quantity', err is not null and v_stock = 12, coalesce(err, 'accepted!'));
end $$;

do $$
declare v_b uuid; v_pid uuid; err text;
begin
  select b, pid into v_b, v_pid from test_ctx;
  perform pg_temp.set_auth(v_b);
  begin
    perform adjust_stock(v_pid, 'receive', 5, null, null, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T09 RPC on another owner''s product rejected', err is not null, coalesce(err, 'accepted!'));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_stock numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    update products set current_stock = 999 where id = v_pid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select current_stock into v_stock from products where id = v_pid;
  perform pg_temp.rec('T10 direct client write to current_stock blocked by guard trigger',
    err is not null and v_stock = 12 and position('adjust_stock' in err) > 0, coalesce(err, 'write succeeded!'));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_price numeric; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    update products set sell_price = 200 where id = v_pid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select sell_price into v_price from products where id = v_pid;
  perform pg_temp.rec('T16 owner can still edit own product prices', err is null and v_price = 200, coalesce(err, 'price=' || v_price));
end $$;

do $$
declare v_a uuid; v_pid uuid; v_exists boolean; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    delete from products where id = v_pid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select exists(select 1 from products where id = v_pid) into v_exists;
  perform pg_temp.rec('T14 hard delete has no RLS policy (soft-delete enforced)',
    v_exists, case when v_exists then 'row survived' else 'ROW WAS DELETED' end);
end $$;

do $$
declare v_a uuid; v_pid uuid; n int; v_min_abs numeric;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  update stock_movements set quantity = 1 where product_id = v_pid;
  perform pg_temp.clear_auth();
  select count(*) into n from stock_movements where product_id = v_pid and quantity = 1;
  select min(abs(quantity)) into v_min_abs from stock_movements where product_id = v_pid;
  perform pg_temp.rec('T19 movement history is append-only (no UPDATE policy)',
    n = 0 and v_min_abs <> 1, 'rows_modified=' || n);
end $$;

do $$
declare v_a uuid; v_sid uuid; v_cid uuid; v_balance numeric; err text;
begin
  select a, sid_a into v_a, v_sid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    insert into carnet_customers (store_id, full_name, phone) values (v_sid, 'Ahmed Test', '0550000000')
    returning id into v_cid;
    perform record_carnet_transaction(v_cid, 'credit', 500, null);
    perform record_carnet_transaction(v_cid, 'payment', 700, null);
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  update test_ctx set cid = v_cid where a = v_a;
  select balance into v_balance from carnet_customers where id = v_cid;
  perform pg_temp.rec('T11 carnet RPC: credit +500 then payment 700 → balance -200 (overpayment allowed by design)',
    err is null and v_balance = -200, coalesce(err, 'balance=' || v_balance));
end $$;

do $$
declare v_a uuid; v_cid uuid; v_balance numeric; err text;
begin
  select a, cid into v_a, v_cid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    update carnet_customers set balance = 0 where id = v_cid;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.clear_auth();
  select balance into v_balance from carnet_customers where id = v_cid;
  perform pg_temp.rec('T12 direct client write to balance blocked by guard trigger',
    err is not null and v_balance = -200 and position('record_carnet_transaction' in err) > 0,
    coalesce(err, 'write succeeded!'));
end $$;

do $$
declare v_b uuid; v_cid uuid; n int;
begin
  select b, cid into v_b, v_cid from test_ctx;
  perform pg_temp.set_auth(v_b);
  select count(*) into n from carnet_customers where id = v_cid;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T13 cross-store carnet customer SELECT blocked', n = 0, 'count=' || n);
end $$;

do $$
declare n int;
begin
  execute 'set local role anon';
  execute 'set local request.jwt.claims = ''{}''';
  select count(*) into n from stores;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T15 anon role sees zero stores', n = 0, 'count=' || n);
end $$;

do $$
declare v_a uuid; v_pid uuid; v_status text; err text;
begin
  select a, pid into v_a, v_pid from test_ctx;
  perform pg_temp.set_auth(v_a);
  begin
    perform adjust_stock(v_pid, 'damage', 12, null, 'vidage test', null);
  exception when others then err := sqlerrm;
  end;
  select stock_status into v_status from products_overview where id = v_pid;
  perform pg_temp.clear_auth();
  perform pg_temp.rec('T18 products_overview exposes stock_status out at zero',
    err is null and v_status = 'out', coalesce(err, 'status=' || v_status));
end $$;

do $$
declare v_a uuid; v_stats json; ok boolean;
begin
  select a into v_a from test_ctx;
  perform pg_temp.set_auth(v_a);
  select get_dashboard_stats() into v_stats;
  perform pg_temp.clear_auth();
  ok := v_stats is not null
    and (v_stats->>'out_count') = '1'
    and (v_stats->>'low_count') = '0'
    and (v_stats->>'stock_value')::numeric = 0
    and (v_stats->>'carnet_total') = '0';
  perform pg_temp.rec('T17 get_dashboard_stats scoped to own store', ok, coalesce(v_stats::text, 'null'));
end $$;

select pg_temp.wipe_test_data();

select name, passed, detail from test_results order by id;

do $$
declare v_fail int; v_total int;
begin
  select count(*), count(*) filter (where not passed) into v_total, v_fail from test_results;
  if v_fail > 0 then
    raise exception 'MANAGIHA TESTS: % of % FAILED — see results above', v_fail, v_total;
  else
    raise notice 'MANAGIHA TESTS: all % passed', v_total;
  end if;
end $$;
