-- Demo store seed.
--
-- Creates a plausible Algerian mini-market for the public demo account:
-- products across five categories, three suppliers, three carnet customers, and
-- a history of movements and sales.
--
-- Requires the demo user to exist. Create it once by signing up in the app with
-- demo@managiha.app, then run this file. It is safe to re-run: it wipes only the
-- demo account's own rows first.
--
-- Every quantity and balance goes through adjust_stock / checkout_sale /
-- record_carnet_transaction. Nothing writes current_stock or balance directly,
-- because the guard triggers refuse it — which is the point of the schema, and
-- seeding that bypassed it would produce a store whose history does not add up.

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
    delete from product_lots where store_id = any(v_sids);
    delete from carnet_transactions where store_id = any(v_sids);
    delete from carnet_customers where store_id = any(v_sids);
    delete from products where store_id = any(v_sids);
    delete from suppliers where store_id = any(v_sids);
    delete from categories where store_id = any(v_sids);
    delete from idempotency_keys where store_id = any(v_sids);
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
  v_ahmed uuid;
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

  select id into v_ahmed from carnet_customers where store_id = v_store and full_name = 'Ahmed Benali';

  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_user::text, 'role', 'authenticated')::text);

  -- Opening stock: one lot per product, 50 units, no expiry date.
  for v_pid in select id from products where store_id = v_store loop
    perform adjust_stock(v_pid, 'opening_balance', 50, null, 'Stock initial', null);
  end loop;

  -- A second, dated delivery so the product page shows a real FEFO queue rather
  -- than a single lot, and the expiry report has something to report on.
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Coca-Cola 1L'),
    'receive', 10, 120, null, null,
    gen_random_uuid(), null, current_date + 21, 'LOT-A21'
  );
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Lait 1L UHT'),
    'receive', 24, 110, null, null,
    gen_random_uuid(), null, current_date + 4, 'LAIT-J4'
  );
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Yaourt nature x4'),
    'receive', 18, 140, null, null,
    gen_random_uuid(), null, current_date + 2, 'YAOURT-J2'
  );
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Jus orange 1L'),
    'receive', 12, 160, null, null,
    gen_random_uuid(), null, current_date + 40, 'JUS-J40'
  );

  -- A loss and a physical count, so the history is not uniformly additive.
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Eau minérale 1,5L'),
    'damage', 2, null, 'casse', null
  );
  perform adjust_stock(
    (select id from products where store_id=v_store and name='Lait 1L UHT'),
    'count_adjustment', 44, null, 'comptage', null
  );

  -- Sales.
  --
  -- These are here because they were missing. The demo used to record only stock
  -- movements, and a movement is not a sale: revenue lives in the price the sale
  -- stored, not in the quantity that left. So every revenue, margin and
  -- best-seller figure was zero and the flagship reports looked broken in the
  -- demo. Driving checkout_sale is also what exercises the FEFO allocation and
  -- the cash-change maths.
  perform checkout_sale(
    jsonb_build_array(
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Coca-Cola 1L'), 'quantity', 2),
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Biscuits nature 200g'), 'quantity', 3)
    ), 'cash', null, 1000, 'Vente comptoir', gen_random_uuid()
  );

  perform checkout_sale(
    jsonb_build_array(
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Eau minérale 1,5L'), 'quantity', 6),
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Biscuits nature 200g'), 'quantity', 2)
    ), 'cash', null, 1000, null, gen_random_uuid()
  );

  perform checkout_sale(
    jsonb_build_array(
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Huile 1L'), 'quantity', 1),
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Sucre 1kg'), 'quantity', 2)
    ), 'cash', null, 1000, null, gen_random_uuid()
  );

  -- A credit sale: the cart goes on the customer's tab instead of taking cash.
  -- This is the single most important flow in the product, so the demo should
  -- show a real one rather than only a hand-entered credit line.
  perform checkout_sale(
    jsonb_build_array(
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Lait 1L UHT'), 'quantity', 3),
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Yaourt nature x4'), 'quantity', 2)
    ), 'credit', v_ahmed, null, 'Achat à crédit', gen_random_uuid()
  );

  perform checkout_sale(
    jsonb_build_array(
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Chips x12'), 'quantity', 1),
      jsonb_build_object('product_id', (select id from products where store_id=v_store and name='Jus orange 1L'), 'quantity', 2)
    ), 'cash', null, 1500, null, gen_random_uuid()
  );

  -- A few products deliberately left low or empty, so the dashboard alert, the
  -- low-stock report and the reorder list have something to show. A demo where
  -- everything is healthy never demonstrates the thing the owner opens the app
  -- for, and "some low, some out" is the whole reason the first screen exists.
  -- count_adjustment takes the absolute counted quantity, not a delta.
  perform adjust_stock((select id from products where store_id=v_store and name='Farine 1kg'), 'count_adjustment', 0, null, 'comptage', null);
  perform adjust_stock((select id from products where store_id=v_store and name='Chips x12'), 'count_adjustment', 2, null, 'comptage', null);
  perform adjust_stock((select id from products where store_id=v_store and name='Savon de Marseille'), 'count_adjustment', 4, null, 'comptage', null);
  perform adjust_stock((select id from products where store_id=v_store and name='Gel douche 1L'), 'count_adjustment', 2, null, 'comptage', null);

  -- Hand-entered carnet lines: the "not from a sale" path.
  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Ahmed Benali';
  perform record_carnet_transaction(v_cid, 'credit', 3500, 'Livraison semaine');
  perform record_carnet_transaction(v_cid, 'payment', 500, 'Acompte');

  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Sara Mebarki';
  perform record_carnet_transaction(v_cid, 'credit', 1200, null);

  select id into v_cid from carnet_customers where store_id = v_store and full_name = 'Yacine Khelifi';
  perform record_carnet_transaction(v_cid, 'credit', 800, null);
  perform record_carnet_transaction(v_cid, 'payment', 800, 'Soldé');

  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ''{}''';

  -- Age some history so the 7 / 30 / 90 day windows are not identical.
  --
  -- This is the one place the seed writes outside the RPCs, and it writes only the
  -- timestamp: the quantity was already recorded by checkout_sale, and moving a
  -- date does not change what was sold, only when. Without it every period tab
  -- shows the same numbers and the control looks broken.
  update stock_movements
  set created_at = created_at - interval '45 days'
  where store_id = v_store
    and id in (
      select id from stock_movements
      where store_id = v_store and movement_type = 'sale'
      order by created_at
      limit 2
    );
end $$;

select 'Demo seed complete.' as result,
  (select count(*) from products) as products,
  (select count(*) from product_lots) as lots,
  (select count(*) from stock_movements) as movements,
  (select count(*) from stock_movements where movement_type = 'sale') as sales,
  (select count(*) from carnet_customers) as customers,
  (select count(*) from carnet_transactions) as carnet_tx;
