-- ============================================================================
-- legal_rpc_tests.sql - proves the Loi 18-07 erasure and access paths.
--
-- The interesting assertions are the refusals. A right of erasure that quietly
-- destroys a shop's evidence of a debt is worse than no right of erasure at all,
-- so L03 and L04 matter more than L05.
--
-- Self-contained and self-cleaning.
-- ============================================================================

create temp table if not exists legal_results (
  id serial primary key,
  name text not null,
  passed boolean not null,
  detail text
);

create temp table if not exists legal_ctx (
  user_a uuid, store_a uuid, cid_a uuid, cid_debt uuid
);

create or replace function pg_temp.l_auth(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.l_clear() returns void
language plpgsql as $$
begin
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';
end $$;

create or replace function pg_temp.l_rec(p_name text, p_passed boolean, p_detail text) returns void
language plpgsql as $$
begin
  insert into legal_results (name, passed, detail)
  values (p_name, coalesce(p_passed, false), coalesce(p_detail, 'NULL detail'));
end $$;

create or replace function pg_temp.l_wipe() returns void
language plpgsql as $$
declare v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email like '%@legaltest.managiha.test';

  if v_sids <> '{}'::uuid[] then
    delete from data_erasure_log where store_id = any(v_sids);
    delete from stock_movements where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from product_lots where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from carnet_customers where store_id = any(v_sids);
  end if;

  delete from stores where owner_id in (select id from auth.users where email like '%@legaltest.managiha.test');
  delete from profiles where id in (select id from auth.users where email like '%@legaltest.managiha.test');
  delete from auth.users where email like '%@legaltest.managiha.test';
end $$;

select pg_temp.l_wipe();

-- ── Seed one settled customer and one debtor ────────────────────────────────
do $$
declare v_user uuid; v_store uuid; v_ok uuid; v_debt uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), 'authenticated', 'authenticated', 'legal@legaltest.managiha.test', 'x',
    now(), '{"provider":"email","providers":["email"]}', '{"store_name":"Legal Store"}', now(), now())
  returning id into v_user;

  select id into v_store from stores where owner_id = v_user;

  perform pg_temp.l_auth(v_user);
  insert into carnet_customers (store_id, full_name, phone, notes)
  values (v_store, 'Nadia Belkacem', '0550112233', 'vends au marché') returning id into v_ok;
  insert into carnet_customers (store_id, full_name, phone)
  values (v_store, 'Karim Debtor', '0660445566') returning id into v_debt;

  perform record_carnet_transaction(p_customer_id => v_ok, p_type => 'credit', p_amount => 300);
  perform record_carnet_transaction(p_customer_id => v_ok, p_type => 'payment', p_amount => 300);
  perform record_carnet_transaction(p_customer_id => v_debt, p_type => 'credit', p_amount => 800);
  perform pg_temp.l_clear();

  insert into legal_ctx (user_a, store_a, cid_a, cid_debt) values (v_user, v_store, v_ok, v_debt);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L01/L02: right of access
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_cid uuid; v_doc jsonb;
begin
  select user_a, cid_a into v_uid, v_cid from legal_ctx;
  perform pg_temp.l_auth(v_uid);
  select export_carnet_customer(v_cid) into v_doc;
  perform pg_temp.l_clear();

  perform pg_temp.l_rec('L01 export returns the subject''s own record',
    v_doc ? 'customer' and v_doc ? 'transactions' and v_doc ? 'erasures',
    'keys=' || (select string_agg(k, ',') from jsonb_object_keys(v_doc) k));
  perform pg_temp.l_rec('L02 export includes the full ledger',
    jsonb_array_length(v_doc -> 'transactions') = 2,
    'transactions=' || jsonb_array_length(v_doc -> 'transactions'));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L03/L04: erasure is refused while a debt is outstanding
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_debt uuid; err text; v_name text; n int;
begin
  select user_a, cid_debt into v_uid, v_debt from legal_ctx;
  perform pg_temp.l_auth(v_uid);
  begin
    perform anonymize_carnet_customer(v_debt, 'test request');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.l_clear();

  select full_name into v_name from carnet_customers where id = v_debt;
  select count(*) into n from data_erasure_log where subject_id = v_debt;

  perform pg_temp.l_rec('L03 erasure refused while a balance is outstanding',
    err is not null and v_name = 'Karim Debtor',
    coalesce(err, 'NO ERROR, name still ' || v_name));
  perform pg_temp.l_rec('L04 a refused erasure writes no log entry', n = 0, 'log rows=' || n);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L05-L09: erasure clears the person, keeps the ledger
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_cid uuid; v_name text; v_phone text; v_notes text;
        v_tx int; v_archived timestamptz; v_log int; v_reason text;
begin
  select user_a, cid_a into v_uid, v_cid from legal_ctx;
  perform pg_temp.l_auth(v_uid);
  perform anonymize_carnet_customer(v_cid, 'demande Loi 18-07');
  perform pg_temp.l_clear();

  select full_name, phone, notes, archived_at into v_name, v_phone, v_notes, v_archived
  from carnet_customers where id = v_cid;
  select count(*) into v_tx from carnet_transactions where customer_id = v_cid;
  select count(*), max(reason) into v_log, v_reason
  from data_erasure_log where subject_id = v_cid;

  perform pg_temp.l_rec('L05 personal data is cleared', v_phone is null and v_notes is null,
    format('phone=%s notes=%s', coalesce(v_phone, 'null'), coalesce(v_notes, 'null')));
  perform pg_temp.l_rec('L06 the name is replaced, not deleted',
    v_name = '[anonymised]', 'name=' || coalesce(v_name, 'null'));
  perform pg_temp.l_rec('L07 the customer is archived', v_archived is not null,
    'archived_at=' || coalesce(v_archived::text, 'null'));
  perform pg_temp.l_rec('L08 the financial ledger survives erasure', v_tx = 2,
    'transactions kept=' || v_tx);
  perform pg_temp.l_rec('L09 the erasure is logged with its reason',
    v_log = 1 and v_reason = 'demande Loi 18-07', format('rows=%s reason=%s', v_log, v_reason));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L10: repeating a request is a no-op
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_cid uuid; n int; err text;
begin
  select user_a, cid_a into v_uid, v_cid from legal_ctx;
  perform pg_temp.l_auth(v_uid);
  begin
    perform anonymize_carnet_customer(v_cid, 'second request');
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.l_clear();

  select count(*) into n from data_erasure_log where subject_id = v_cid;
  perform pg_temp.l_rec('L10 a repeated erasure is idempotent',
    err is null and n = 1, format('err=%s log rows=%s', coalesce(err, 'none'), n));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L11: the log cannot be forged by a client
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid; v_store uuid; rows_affected int := 0; err text;
begin
  select user_a, store_a into v_uid, v_store from legal_ctx;
  perform pg_temp.l_auth(v_uid);
  begin
    insert into data_erasure_log (store_id, subject_type, subject_id)
    values (v_store, 'carnet_customer', gen_random_uuid());
    get diagnostics rows_affected = row_count;
  exception when others then err := sqlerrm;
  end;
  perform pg_temp.l_clear();

  perform pg_temp.l_rec('L11 the erasure log cannot be forged',
    err is not null or rows_affected = 0,
    coalesce(err, 'inserted ' || rows_affected || ' rows'));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- L12: anon cannot reach either function
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare a1 boolean; a2 boolean;
begin
  a1 := has_function_privilege('anon', 'public.anonymize_carnet_customer(uuid,text)', 'EXECUTE');
  a2 := has_function_privilege('anon', 'public.export_carnet_customer(uuid)', 'EXECUTE');
  perform pg_temp.l_rec('L12 anon cannot anonymise or export', a1 is false and a2 is false,
    format('anon anonymize=%s export=%s', a1, a2));
end $$;

select pg_temp.l_wipe();

select count(*) as total,
       count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed
from legal_results;

select name, passed, detail from legal_results where not passed order by id;
