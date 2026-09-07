create or replace function pg_temp.demo_wipe() returns void
language plpgsql as $$
declare
  v_sids uuid[];
begin
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sids
  from stores s join auth.users u on u.id = s.owner_id
  where u.email = 'demo@managiha.app';

  if v_sids <> '{}'::uuid[] then
    delete from stock_movements where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from carnet_customers where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from suppliers where store_id = any(v_sids);
    delete from categories where store_id = any(v_sids);
  end if;

  delete from stores where owner_id in (select id from auth.users where email = 'demo@managiha.app');
  delete from profiles where id in (select id from auth.users where email = 'demo@managiha.app');
end $$;

select pg_temp.demo_wipe();

do $$
declare
  v_user uuid;
  v_store uuid;
  v_pid uuid; v_cid uuid;
begin
  select id into v_user from auth.users where email = 'demo@managiha.app';
  if v_user is null then
    raise exception 'Demo user not found. Sign up once via the app with demo@managiha.app first, then re-run this seed.';
  end if;

  if not exists (select 1 from stores where owner_id = v_user) then
    insert into stores (owner_id, name, currency, language, timezone)
    values (v_user, 'Épicerie Démo', 'DZD', 'fr', 'Africa/Algiers');
  end if;

  select id into v_store from stores where owner_id = v_user;

  insert into categories (store_id, name) values
    (v_store, 'Boissons'), (v_store, 'Laitier'), (v_store, 'Épicerie'), (v_store, 'Hygiène'), (v_store, 'Snacks');

  insert into suppliers (store_id, name, phone, whatsapp) values
    (v_store, 'Distrib Alger Est', '0550 12 34 56', '0550 12 34 56'),
    (v_store, 'SUAL Mobili', '023 45 67 89', '023 45 67 89'),
    (v_store, 'Maroc Dari', '0661 98 76 54', '0661 98 76 54');

  insert into products (store_id, category_id, supplier_id, name, unit, cost_price, sell_price, low_stock_threshold, barcode) values
    (v_store, (select id from categories where store_id=v_store and name='Boissons'), (select id from suppliers where store_id=v_store and name='Distrib Alger Est'), 'Coca-Cola 1L', 'piece', 120, 150, 12, '5449000100409'),
    (v_store, (select id from categories where store_id=v_store and name='Boissons'), (select id from suppliers where store_id=v_store and name='Distrib Alger Est'), 'Eau minérale 1,5L', 'piece', 35, 50, 20, '6130078942013'),
    (v_store, (select id from categories where store_id=v_store and name='Laitier'), (select id from suppliers where store_id=v_store and name='Maroc Dari'), 'Lait 1L UHT', 'piece', 110, 130, 10, '6180001015001'),
    (v_store, (select id from categories where store_id=v_store and name='Laitier'), (select id from suppliers where store_id=v_store and name='Maroc Dari'), 'Yaourt nature x4', 'pack', 140, 180, 6, null),
    (v_store, (select id from categories where store_id=v_store and name='Épicerie'), (select id from suppliers where store_id=v_store and name='SUAL Mobili'), 'Farine 1kg', 'piece', 95, 120, 8, '0000000612407'),
    (v_store, (select id from categories where store_id=v_store and name='Épicerie'), (select id from suppliers where store_id=v_store and name='SUAL Mobili'), 'Huile 1L', 'piece', 380, 450, 6, '6294000973010'),
    (v_store, (select id from categories where store_id=v_store and name='Épicerie'), (select id from suppliers where store_id=v_store and name='SUAL Mobili'), 'Sucre 1kg', 'piece', 105, 125, 10, '0000000040232'),
    (v_store, (select id from categories where store_id=v_store and name='Hygiène'), (select id from suppliers where store_id=v_store and name='SUAL Mobili'), 'Savon de Marseille', 'piece', 90, 130, 5, null),
    (v_store, (select id from categories where store_id=v_store and name='Hygiène'), (select id from suppliers where store_id=v_store and name='SUAL Mobili'), 'Gel douche 1L', 'piece', 240, 320, 4, '6130078889012'),
    (v_store, (select id from categories where store_id=v_store and name='Snacks'), (select id from suppliers where store_id=v_store and name='Distrib Alger Est'), 'Chips x12', 'box', 480, 600, 3, null),
    (v_store, (select id from categories where store_id=v_store and name='Snacks'), (select id from suppliers where store_id=v_store and name='Distrib Alger Est'), 'Biscuits nature 200g', 'piece', 65, 90, 8, '6294000361141'),
    (v_store, (select id from categories where store_id=v_store and name='Boissons'), (select id from suppliers where store_id=v_store and name='Maroc Dari'), 'Jus orange 1L', 'piece', 160, 200, 6, null);

  insert into carnet_customers (store_id, full_name, phone, notes) values
    (v_store, 'Ahmed Benali', '0550 11 22 33', 'Client du quartier, paye chaque vendredi'),
    (v_store, 'Sara Mebarki', '0660 44 55 66', null),
    (v_store, 'Yacine Khelifi', '0770 77 88 99', 'Rembourse fin de mois');

  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_user::text, 'role', 'authenticated')::text);

  for v_pid in select id from products where store_id = v_store loop
    perform adjust_stock(v_pid, 'opening_balance', 50, null, 'Stock initial', null);
  end loop;

  select id into v_pid from products where store_id = v_store and name = 'Coca-Cola 1L';
  perform adjust_stock(v_pid, 'receive', 10, 120, null, null);
  select id into v_pid from products where store_id = v_store and name = 'Eau minérale 1,5L';
  perform adjust_stock(v_pid, 'damage', 2, null, 'casse', null);
  select id into v_pid from products where store_id = v_store and name = 'Lait 1L UHT';
  perform adjust_stock(v_pid, 'count_adjustment', 44, null, 'comptage', null);

  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Ahmed Benali';
  perform record_carnet_transaction(v_cid, 'credit', 3500, 'Livraison semaine');
  perform record_carnet_transaction(v_cid, 'credit', 1500, 'Divers');
  perform record_carnet_transaction(v_cid, 'payment', 500, 'Acompte');

  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Sara Mebarki';
  perform record_carnet_transaction(v_cid, 'credit', 1200, null);

  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Yacine Khelifi';
  perform record_carnet_transaction(v_cid, 'credit', 800, null);
  perform record_carnet_transaction(v_cid, 'payment', 800, 'Soldé');

  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';
end $$;

select 'Demo seed complete: 12 products, 3 suppliers, 5 categories, 3 carnet customers, movements + transactions recorded via RPCs.' as result;