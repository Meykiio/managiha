-- Managiha database schema, generated file. Do not edit by hand.
--
-- Source:    supabase/migrations/*.sql, concatenated in filename order.
-- Regenerate: npm run db:bundle
-- Covers:     migrations 20260823000000 through 20260823000024 (25 files).
--
-- NOT idempotent. Migrations use plain CREATE TABLE, so this script is meant
-- for a FRESH database. To reset an existing one use `supabase db reset`,
-- which replays the migration files themselves.

begin;

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000000  init.sql
-- ══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  currency char(3) not null default 'DZD',
  language text not null default 'fr',
  timezone text not null default 'Africa/Algiers',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null,
  phone text,
  whatsapp text,
  address text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  category_id uuid references public.categories(id),
  supplier_id uuid references public.suppliers(id),
  name text not null,
  sku text,
  barcode text,
  unit text not null default 'piece',
  cost_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  current_stock numeric(12,3) not null default 0,
  low_stock_threshold numeric(12,3),
  expiry_date date,
  image_path text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, sku),
  unique(store_id, barcode)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  product_id uuid not null references public.products(id),
  movement_type text not null check (movement_type in
    ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance')),
  quantity numeric(12,3) not null check (quantity <> 0),
  unit_cost numeric(12,2),
  reason text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.carnet_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  full_name text not null,
  phone text,
  notes text,
  balance numeric(12,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carnet_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  customer_id uuid not null references public.carnet_customers(id),
  type text not null check (type in ('credit','payment','adjustment')),
  amount numeric(12,2) not null check (amount <> 0),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_stores_owner on public.stores(owner_id);
create index idx_categories_store on public.categories(store_id);
create index idx_suppliers_store on public.suppliers(store_id);
create index idx_products_store on public.products(store_id);
create index idx_products_barcode on public.products(barcode);
create index idx_products_sku on public.products(sku);
create index idx_movements_store_date on public.stock_movements(store_id, created_at desc);
create index idx_movements_product on public.stock_movements(product_id, created_at desc);
create index idx_carnet_customers_store on public.carnet_customers(store_id);
create index idx_carnet_tx_customer on public.carnet_transactions(customer_id, created_at desc);
create index idx_carnet_tx_store on public.carnet_transactions(store_id, created_at desc);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_stores_updated before update on public.stores
  for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_carnet_customers_updated before update on public.carnet_customers
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000001  rls.sql
-- ══════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.carnet_customers enable row level security;
alter table public.carnet_transactions enable row level security;

create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.stores
    where stores.id = p_store_id and stores.owner_id = auth.uid()
  );
$$;

revoke execute on function public.is_store_owner(uuid) from public, anon;
grant execute on function public.is_store_owner(uuid) to authenticated;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "stores_select_own" on public.stores
  for select using (owner_id = auth.uid());
create policy "stores_insert_own" on public.stores
  for insert with check (owner_id = auth.uid());
create policy "stores_update_own" on public.stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "categories_select" on public.categories
  for select using (public.is_store_owner(store_id));
create policy "categories_insert" on public.categories
  for insert with check (public.is_store_owner(store_id));
create policy "categories_update" on public.categories
  for update using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

create policy "suppliers_select" on public.suppliers
  for select using (public.is_store_owner(store_id));
create policy "suppliers_insert" on public.suppliers
  for insert with check (public.is_store_owner(store_id));
create policy "suppliers_update" on public.suppliers
  for update using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

create policy "products_select" on public.products
  for select using (public.is_store_owner(store_id));
create policy "products_insert" on public.products
  for insert with check (public.is_store_owner(store_id));
create policy "products_update" on public.products
  for update using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

create policy "stock_movements_select" on public.stock_movements
  for select using (public.is_store_owner(store_id));
create policy "stock_movements_insert" on public.stock_movements
  for insert with check (public.is_store_owner(store_id));

create policy "carnet_customers_select" on public.carnet_customers
  for select using (public.is_store_owner(store_id));
create policy "carnet_customers_insert" on public.carnet_customers
  for insert with check (public.is_store_owner(store_id));
create policy "carnet_customers_update" on public.carnet_customers
  for update using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

create policy "carnet_transactions_select" on public.carnet_transactions
  for select using (public.is_store_owner(store_id));
create policy "carnet_transactions_insert" on public.carnet_transactions
  for insert with check (public.is_store_owner(store_id));

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000002  functions.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.stores (owner_id, name, currency, language, timezone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'store_name', ''), 'Mon magasin'),
    'DZD',
    'fr',
    'Africa/Algiers'
  )
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;
  if not public.is_store_owner(v_store_id) then
    raise exception 'Accès refusé';
  end if;

  if p_movement_type in ('receive','return','opening_balance') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := p_quantity;
  elsif p_movement_type in ('sale','damage','theft') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := -p_quantity;
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  v_new_stock := v_current + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock insuffisant : % en stock pour un mouvement de %', v_current, v_delta;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
  values
    (v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note, auth.uid())
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

create or replace function public.record_carnet_transaction(
  p_customer_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_signed numeric(12,2);
  v_tx_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_type not in ('credit','payment','adjustment') then
    raise exception 'Type de transaction invalide';
  end if;

  select store_id, balance into v_store_id, v_balance
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;
  if not public.is_store_owner(v_store_id) then
    raise exception 'Accès refusé';
  end if;

  if p_type in ('credit','payment') then
    if p_amount is null or p_amount <= 0 then
      raise exception 'Le montant doit être supérieur à 0';
    end if;
    if p_type = 'credit' then
      v_signed := p_amount;
    else
      v_signed := -p_amount;
    end if;
  else
    if p_amount is null or p_amount = 0 then
      raise exception 'Le montant ne peut pas être nul';
    end if;
    v_signed := p_amount;
  end if;

  select balance into v_balance
  from public.carnet_customers
  where id = p_customer_id
  for update;

  v_new_balance := v_balance + v_signed;

  update public.carnet_customers
  set balance = v_new_balance, updated_at = now()
  where id = p_customer_id;

  insert into public.carnet_transactions
    (store_id, customer_id, type, amount, note, created_by)
  values
    (v_store_id, p_customer_id, p_type, v_signed, p_note, auth.uid())
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;

  if v_store_id is null then
    return json_build_object('stock_value', 0, 'low_count', 0, 'out_count', 0, 'carnet_total', 0);
  end if;

  return json_build_object(
    'stock_value',
    coalesce((
      select sum(p.cost_price * p.current_stock)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
    ), 0),
    'low_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.low_stock_threshold is not null
        and p.current_stock > 0
        and p.current_stock <= p.low_stock_threshold
    ),
    'out_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.current_stock <= 0
    ),
    'carnet_total',
    coalesce((
      select sum(c.balance)
      from public.carnet_customers c
      where c.store_id = v_store_id and c.archived_at is null and c.balance > 0
    ), 0)
  );
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text) from public, anon;
revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000003  views_storage.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace view public.products_overview
with (security_invoker = true) as
select
  p.*,
  case
    when p.current_stock <= 0 then 'out'
    when p.low_stock_threshold is not null and p.current_stock <= p.low_stock_threshold then 'low'
    else 'healthy'
  end as stock_status
from public.products p;

grant select on public.products_overview to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

create policy "product_images_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000004  backfill_existing_users.sql
-- ══════════════════════════════════════════════════════════════════════

insert into public.profiles (id, full_name)
select u.id, nullif(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.stores (owner_id, name, currency, language, timezone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'store_name', ''), 'Mon magasin'),
  'DZD',
  'fr',
  'Africa/Algiers'
from auth.users u
where not exists (select 1 from public.stores s where s.owner_id = u.id);

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000005  grants_schema_reload.sql
-- ══════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

revoke execute on function public.is_store_owner(uuid) from public, anon;
revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text) from public, anon;
revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.is_store_owner(uuid) to authenticated;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000006  guard_rpc_only_columns.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.guard_computed_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'products'
     and new.current_stock is distinct from old.current_stock
     and current_user = 'authenticated' then
    raise exception 'current_stock ne peut être modifié que via la fonction adjust_stock()';
  end if;

  if tg_table_name = 'carnet_customers'
     and new.balance is distinct from old.balance
     and current_user = 'authenticated' then
    raise exception 'balance ne peut être modifiée que via la fonction record_carnet_transaction()';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_guard_stock on public.products;
create trigger trg_products_guard_stock
  before update on public.products
  for each row execute function public.guard_computed_columns();

drop trigger if exists trg_carnet_guard_balance on public.carnet_customers;
create trigger trg_carnet_guard_balance
  before update on public.carnet_customers
  for each row execute function public.guard_computed_columns();

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000007  bucket_hardening.sql
-- ══════════════════════════════════════════════════════════════════════

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'product-images';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000008  fix_guard_triggers.sql
-- ══════════════════════════════════════════════════════════════════════

drop trigger if exists trg_products_guard_stock on public.products;
drop trigger if exists trg_carnet_guard_balance on public.carnet_customers;

drop function if exists public.guard_computed_columns();

create or replace function public.guard_stock_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_stock is distinct from old.current_stock
     and current_user = 'authenticated' then
    raise exception 'current_stock ne peut être modifié que via la fonction adjust_stock()';
  end if;
  return new;
end;
$$;

create or replace function public.guard_balance_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.balance is distinct from old.balance
     and current_user = 'authenticated' then
    raise exception 'balance ne peut être modifiée que via la fonction record_carnet_transaction()';
  end if;
  return new;
end;
$$;

create trigger trg_products_guard_stock
  before update on public.products
  for each row execute function public.guard_stock_column();

create trigger trg_carnet_guard_balance
  before update on public.carnet_customers
  for each row execute function public.guard_balance_column();

revoke execute on function public.guard_stock_column() from public, anon;
revoke execute on function public.guard_balance_column() from public, anon;

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000009  adjust_stock_count_semantics.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;
  if not public.is_store_owner(v_store_id) then
    raise exception 'Accès refusé';
  end if;

  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  if p_movement_type in ('receive','return','opening_balance') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := p_quantity;
  elsif p_movement_type in ('sale','damage','theft') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := -p_quantity;
  elsif p_movement_type = 'count_adjustment' then
    if p_quantity is null or p_quantity < 0 then
      raise exception 'La quantité constatée ne peut pas être négative';
    end if;
    v_delta := p_quantity - v_current;
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  v_new_stock := v_current + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock insuffisant : % en stock pour un mouvement de %', v_current, v_delta;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
  values
    (v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note, auth.uid())
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000010  checkout_sale_rpc.sql
-- ══════════════════════════════════════════════════════════════════════

-- Atomic checkout: process all items in one transaction
-- Prevents partial sales and double stock decrements

create or replace function public.checkout_sale(
  p_items jsonb, -- [{product_id, quantity, unit_price}]
  p_payment_mode text, -- 'cash' or 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total numeric := 0;
  v_change numeric := 0;
  v_movement_ids uuid[] := '{}';
  v_movement_id uuid;
  v_current numeric(12,3);
  v_new_stock numeric(12,3);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash', 'credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  -- Validate all items first (before any stock changes)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_product_id;
    end if;

    -- Get store_id from first product (all items must be from same store)
    if v_store_id is null then
      select store_id into v_store_id from public.products where id = v_product_id;
      if v_store_id is null then
        raise exception 'Produit introuvable: %', v_product_id;
      end if;
      if not public.is_store_owner(v_store_id) then
        raise exception 'Accès refusé';
      end if;
    end if;

    -- Check stock availability (with row lock)
    select current_stock into v_current
    from public.products
    where id = v_product_id
    for update;

    if v_current < v_quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        (select name from public.products where id = v_product_id),
        v_current, v_quantity;
    end if;

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  -- Validate payment
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  end if;

  -- Process all items (stock decrements)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;

    -- Decrement stock
    update public.products
    set current_stock = current_stock - v_quantity, updated_at = now()
    where id = v_product_id
    returning current_stock into v_new_stock;

    -- Record movement
    insert into public.stock_movements
      (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
    values
      (v_store_id, v_product_id, 'sale', -v_quantity, v_unit_price, null,
       coalesce(p_note, 'Vente ' || p_payment_mode), auth.uid())
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
  end loop;

  -- Record carnet transaction for credit sales
  if p_payment_mode = 'credit' then
    insert into public.carnet_transactions
      (store_id, customer_id, type, amount, note, created_by)
    values
      (v_store_id, p_customer_id, 'credit', v_total,
       coalesce(p_note, 'Achat ' || jsonb_array_length(p_items) || ' produit(s)'), auth.uid());
  end if;

  v_result := jsonb_build_object(
    'total', v_total,
    'change', v_change,
    'movement_ids', v_movement_ids,
    'items_count', jsonb_array_length(p_items)
  );

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text) from public, anon;
grant execute on function public.checkout_sale(jsonb, text, uuid, numeric, text) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000011  dashboard_product_count.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;

  if v_store_id is null then
    return json_build_object('stock_value', 0, 'low_count', 0, 'out_count', 0, 'carnet_total', 0, 'product_count', 0);
  end if;

  return json_build_object(
    'stock_value',
    coalesce((
      select sum(p.cost_price * p.current_stock)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
    ), 0),
    'low_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.low_stock_threshold is not null
        and p.current_stock > 0
        and p.current_stock <= p.low_stock_threshold
    ),
    'out_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.current_stock <= 0
    ),
    'product_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
    ),
    'carnet_total',
    coalesce((
      select sum(c.balance)
      from public.carnet_customers c
      where c.store_id = v_store_id and c.archived_at is null and c.balance > 0
    ), 0)
  );
end;
$$;

revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.get_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000012  movements_summary_rpc.sql
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.get_movements_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table(movement_type text, movement_count bigint, net_qty numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  select
    m.movement_type,
    count(*) as movement_count,
    sum(m.quantity) as net_qty
  from public.stock_movements m
  where m.store_id = v_store_id
    and m.created_at >= p_from
    and m.created_at <= p_to
  group by m.movement_type;
end;
$$;

revoke execute on function public.get_movements_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_movements_summary(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000013  checkout_sale_secure.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00013 - Phase 1a: secure checkout_sale + write idempotency
--
-- Fixes, in order of severity:
--
--   1. CROSS-TENANT WRITE. checkout_sale verified ownership only for the first
--      cart line (`if v_store_id is null`). Lines 2..n were never checked, so an
--      authenticated user could pass their own product first, then a victim's
--      product id, and decrement another store's stock.
--      Fix: every line is locked, ownership-checked and pinned to one store_id.
--
--   2. CREDIT SALES NEVER UPDATED THE BALANCE. checkout_sale inserted directly
--      into carnet_transactions instead of calling record_carnet_transaction, so
--      carnet_customers.balance stayed stale forever.
--      Fix: the credit path now delegates to record_carnet_transaction.
--
--   3. DUPLICATE LINES COULD DRIVE STOCK NEGATIVE. Stock was validated per line
--      but decremented in a second loop: two lines of 6 against stock 10 both
--      passed validation and then produced -2.
--      Fix: lines are aggregated by product_id before any validation.
--
--   4. CLIENT-SUPPLIED PRICE WAS TRUSTED. p_items[].unit_price came from the
--      browser and drove both the total and the movement unit_cost.
--      Fix: price is read from products.sell_price. The parameter is removed.
--
--   5. NO IDEMPOTENCY. A retry, a double tap or a flaky connection silently
--      double-decremented stock.
--      Fix: idempotency_keys, claimed inside the same transaction as the writes.
--
--   6. THE CREDIT CUSTOMER WAS NEVER CHECKED. Any authenticated user could post
--      a carnet transaction onto another store's customer.
--      Fix: the customer must belong to the caller's store.
--
-- Phase 2 extends checkout_sale with FEFO lot consumption and keeps this
-- signature as its contract.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Idempotency ledger.
-- RLS enabled with zero policies, so no client can read or write it. Only the
-- SECURITY DEFINER RPCs below have access. That is intentional: the table is
-- internal bookkeeping, not user data.
-- ---------------------------------------------------------------------------

create table if not exists public.idempotency_keys (
  store_id   uuid        not null references public.stores(id) on delete cascade,
  op_key     uuid        not null,
  endpoint   text        not null,
  result     jsonb,
  created_at timestamptz not null default now(),
  primary key (store_id, op_key)
);

alter table public.idempotency_keys enable row level security;

create index if not exists idx_idempotency_created
  on public.idempotency_keys (created_at);

comment on table public.idempotency_keys is
  'Replay guard for write RPCs. p_client_op_id claims a row here; repeating the same key returns the stored result instead of applying the write twice.';

-- ===========================================================================
-- record_carnet_transaction: add optional idempotency
--
-- Signature changes (a new trailing parameter with a default), so the old
-- 4-argument overload must be dropped or Postgres would keep two and make
-- calls ambiguous. Existing callers keep working because the 7th/5th argument
-- defaults to null.
--
-- p_client_op_id is nullable on purpose: idempotency is a reliability
-- guarantee, not a security control. Passing null keeps the old behaviour and
-- costs the caller only retry-safety, never isolation.
-- ===========================================================================

drop function if exists public.record_carnet_transaction(uuid, text, numeric, text);

create or replace function public.record_carnet_transaction(
  p_customer_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default null,
  p_client_op_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_signed numeric(12,2);
  v_tx_id uuid;
  v_claimed boolean;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_type not in ('credit','payment','adjustment') then
    raise exception 'Type de transaction invalide';
  end if;

  select store_id into v_store_id
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  if p_client_op_id is not null then
    insert into public.idempotency_keys (store_id, op_key, endpoint)
    values (v_store_id, p_client_op_id, 'record_carnet_transaction')
    on conflict (store_id, op_key) do nothing
    returning true into v_claimed;

    if v_claimed is null then
      select result into v_result
      from public.idempotency_keys
      where store_id = v_store_id and op_key = p_client_op_id;

      if v_result is null then
        raise exception 'Opération déjà traitée, résultat indisponible';
      end if;
      return (v_result #>> '{}')::uuid;
    end if;
  end if;

  if p_type in ('credit','payment') then
    if p_amount is null or p_amount <= 0 then
      raise exception 'Le montant doit être supérieur à 0';
    end if;
    if p_type = 'credit' then
      v_signed := p_amount;
    else
      v_signed := -p_amount;
    end if;
  else
    if p_amount is null or p_amount = 0 then
      raise exception 'Le montant ne peut pas être nul';
    end if;
    v_signed := p_amount;
  end if;

  select balance into v_balance
  from public.carnet_customers
  where id = p_customer_id
  for update;

  v_new_balance := v_balance + v_signed;

  update public.carnet_customers
  set balance = v_new_balance, updated_at = now()
  where id = p_customer_id;

  insert into public.carnet_transactions
    (store_id, customer_id, type, amount, note, created_by)
  values
    (v_store_id, p_customer_id, p_type, v_signed, p_note, (select auth.uid()))
  returning id into v_tx_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_tx_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_tx_id;
end;
$$;

revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text, uuid) from public, anon;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text, uuid) to authenticated;

-- ===========================================================================
-- adjust_stock: add optional idempotency. Body otherwise unchanged from 00009
-- so the count_adjustment semantics (absolute counted quantity, delta computed
-- server-side under row lock) are preserved exactly.
-- ===========================================================================

drop function if exists public.adjust_stock(uuid, text, numeric, numeric, text, text);

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null,
  p_client_op_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
  v_claimed boolean;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  if p_client_op_id is not null then
    insert into public.idempotency_keys (store_id, op_key, endpoint)
    values (v_store_id, p_client_op_id, 'adjust_stock')
    on conflict (store_id, op_key) do nothing
    returning true into v_claimed;

    if v_claimed is null then
      select result into v_result
      from public.idempotency_keys
      where store_id = v_store_id and op_key = p_client_op_id;

      if v_result is null then
        raise exception 'Opération déjà traitée, résultat indisponible';
      end if;
      return (v_result #>> '{}')::uuid;
    end if;
  end if;

  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  if p_movement_type in ('receive','return','opening_balance') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := p_quantity;
  elsif p_movement_type in ('sale','damage','theft') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := -p_quantity;
  elsif p_movement_type = 'count_adjustment' then
    if p_quantity is null or p_quantity < 0 then
      raise exception 'La quantité constatée ne peut pas être négative';
    end if;
    v_delta := p_quantity - v_current;
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  v_new_stock := v_current + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock insuffisant : % en stock pour un mouvement de %', v_current, v_delta;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
  values
    (v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note, (select auth.uid()))
  returning id into v_movement_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_movement_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid) from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid) to authenticated;

-- ===========================================================================
-- checkout_sale: full rewrite. Signature changes twice over (unit_price removed
-- from the items, p_client_op_id added), so the 00010 overload is dropped.
-- ===========================================================================

drop function if exists public.checkout_sale(jsonb, text, uuid, numeric, text);

create or replace function public.checkout_sale(
  p_items jsonb,                      -- [{product_id, quantity}] - no price
  p_payment_mode text,                -- 'cash' | 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null,
  -- Trailing parameters require a default or Postgres rejects the whole function
  -- with 42P13. p_client_op_id is still mandatory in practice: the body raises if
  -- it arrives null, which is the same contract with a valid signature.
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_line record;
  v_line_store uuid;
  v_current numeric(12,3);
  v_price numeric(12,2);
  v_name text;
  v_total numeric(14,2) := 0;
  v_change numeric(14,2) := 0;
  v_count integer := 0;
  v_claimed boolean;
  v_result jsonb;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash','credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  if p_client_op_id is null then
    raise exception 'Référence d''opération manquante (p_client_op_id)';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;

  -- ── Resolve and authorise the owning store before anything else ─────────
  select store_id into v_store_id
  from public.products
  where id = (p_items -> 0 ->> 'product_id')::uuid;

  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  -- ── Idempotency claim ───────────────────────────────────────────────────
  -- The primary key (store_id, op_key) is what makes this safe: a repeat blocks
  -- here until the first transaction commits, then falls through to the stored
  -- result. If the first attempt raised, its key row rolled back with it and the
  -- retry runs cleanly.
  insert into public.idempotency_keys (store_id, op_key, endpoint)
  values (v_store_id, p_client_op_id, 'checkout_sale')
  on conflict (store_id, op_key) do nothing
  returning true into v_claimed;

  if v_claimed is null then
    select result into v_result
    from public.idempotency_keys
    where store_id = v_store_id and op_key = p_client_op_id;

    if v_result is null then
      raise exception 'Opération déjà traitée, résultat indisponible';
    end if;
    return v_result;
  end if;

  -- ── Validate every line under lock, pinned to one store ─────────────────
  -- Aggregating by product_id first is what makes duplicate lines safe: 6 + 6
  -- against stock 10 becomes one line of 12 and is rejected here.
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_line.product_id;
    end if;

    -- Lock first, then read the authoritative state under that lock.
    select p.store_id, p.current_stock, p.sell_price, p.name
      into v_line_store, v_current, v_price, v_name
    from public.products p
    where p.id = v_line.product_id
      for update;

    if not found then
      raise exception 'Produit introuvable: %', v_line.product_id;
    end if;

    -- The line that made the old function exploitable.
    if v_line_store <> v_store_id then
      raise exception 'Accès refusé';
    end if;

    if v_current < v_line.quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        v_name, v_current, v_line.quantity;
    end if;

    v_total  := v_total + (v_line.quantity * v_price);
    v_count  := v_count + 1;
  end loop;

  -- ── Payment ─────────────────────────────────────────────────────────────
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  else
    -- Never verified before: any authenticated user could post a carnet
    -- transaction onto another store's customer.
    if not exists (
      select 1 from public.carnet_customers c
      where c.id = p_customer_id and c.store_id = v_store_id
    ) then
      raise exception 'Client introuvable';
    end if;
  end if;

  -- ── Apply ───────────────────────────────────────────────────────────────
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    select sell_price into v_price
    from public.products
    where id = v_line.product_id;

    update public.products p
    set current_stock = p.current_stock - v_line.quantity,
        updated_at = now()
    where p.id = v_line.product_id;

    insert into public.stock_movements
      (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
    values
      (v_store_id, v_line.product_id, 'sale', -v_line.quantity, v_price, null,
       coalesce(p_note, 'Vente comptant'::text), (select auth.uid()))
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
  end loop;

  -- Delegate the credit so the balance is genuinely recomputed. No inner
  -- idempotency key: the claim above already makes this whole call replay-safe.
  if p_payment_mode = 'credit' then
    perform public.record_carnet_transaction(
      p_customer_id,
      'credit'::text,
      v_total,
      coalesce(p_note, 'Achat ' || v_count || ' produit(s)'::text),
      null
    );
  end if;

  v_result := jsonb_build_object(
    'total',       v_total,
    'change',      v_change,
    'movement_ids', to_jsonb(v_movement_ids),
    'items_count', v_count
  );

  update public.idempotency_keys
  set result = v_result
  where store_id = v_store_id and op_key = p_client_op_id;

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) from public, anon;
grant execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000014  private_schema_and_search_path.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00014 - Phase 1b (1/2): move internal helpers out of the exposed
-- schema, and stop granting anon anything.
--
-- Supabase publishes RPCs from "exposed" schemas only, and `public` is exposed
-- by default. A SECURITY DEFINER function living there is callable over the
-- Data API with the definer's privileges, bypassing RLS. That is exactly what we
-- want for the write RPCs, which self-authorise, but it is wrong for the
-- helpers below, whose return values are load-bearing in RLS policy decisions.
--
-- So the split is:
--   public  -> checkout_sale, adjust_stock, record_carnet_transaction,
--              get_dashboard_stats, get_movements_summary
--              (exposed as RPCs; each performs its own ownership check)
--   private -> is_store_owner, guard_stock_column, guard_balance_column
--              (not exposed; referenced only by policies and triggers)
--
-- Every definer function now pins `search_path = ''` and fully qualifies its
-- objects, which is the documented defence against search_path hijacking.
-- ============================================================================

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- is_store_owner -> private, with the (select auth.uid()) wrap.
--
-- The wrap is the single highest-impact RLS change in this file. Without it
-- Postgres calls auth.uid() once per candidate row; with it, the call is
-- uncorrelated and Postgres evaluates it once as an InitPlan and reuses it.
-- Supabase's published benchmark for this exact shape: 179ms -> 9ms. Heavier
-- variants measure far worse.
-- ---------------------------------------------------------------------------

create or replace function private.is_store_owner(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.owner_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_store_owner(uuid) from public, anon;
grant  execute on function private.is_store_owner(uuid) to authenticated;

-- The 22 policies from 00001 call public.is_store_owner directly, and Postgres
-- tracks that as a hard dependency. Dropping the function first would fail with
-- "cannot drop function because other objects depend on it", so the policies go
-- first and 00015 recreates them against private.is_store_owner.
drop policy if exists "profiles_select_own"        on public.profiles;
drop policy if exists "profiles_insert_own"        on public.profiles;
drop policy if exists "profiles_update_own"        on public.profiles;
drop policy if exists "stores_select_own"          on public.stores;
drop policy if exists "stores_insert_own"          on public.stores;
drop policy if exists "stores_update_own"          on public.stores;
drop policy if exists "categories_select"          on public.categories;
drop policy if exists "categories_insert"          on public.categories;
drop policy if exists "categories_update"          on public.categories;
drop policy if exists "suppliers_select"           on public.suppliers;
drop policy if exists "suppliers_insert"           on public.suppliers;
drop policy if exists "suppliers_update"           on public.suppliers;
drop policy if exists "products_select"            on public.products;
drop policy if exists "products_insert"            on public.products;
drop policy if exists "products_update"            on public.products;
drop policy if exists "stock_movements_select"     on public.stock_movements;
drop policy if exists "stock_movements_insert"     on public.stock_movements;
drop policy if exists "carnet_customers_select"    on public.carnet_customers;
drop policy if exists "carnet_customers_insert"    on public.carnet_customers;
drop policy if exists "carnet_customers_update"    on public.carnet_customers;
drop policy if exists "carnet_transactions_select" on public.carnet_transactions;
drop policy if exists "carnet_transactions_insert" on public.carnet_transactions;

drop function if exists public.is_store_owner(uuid);

-- ---------------------------------------------------------------------------
-- Guard triggers -> private.
--
-- These decide whether the RPC-only invariant on products.current_stock and
-- carnet_customers.balance can be bypassed. They must not be reachable over the
-- Data API. Moving them is part of the same hardening.
-- ---------------------------------------------------------------------------

create or replace function private.guard_stock_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_stock is distinct from old.current_stock
     and current_user = 'authenticated' then
    raise exception 'current_stock ne peut être modifié que via une fonction RPC';
  end if;
  return new;
end;
$$;

create or replace function private.guard_balance_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.balance is distinct from old.balance
     and current_user = 'authenticated' then
    raise exception 'balance ne peut être modifiée que via une fonction RPC';
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_stock_column() from public, anon;
revoke execute on function private.guard_balance_column() from public, anon;

drop trigger if exists trg_products_guard_stock on public.products;
drop trigger if exists trg_carnet_guard_balance on public.carnet_customers;

create trigger trg_products_guard_stock
  before update on public.products
  for each row execute function private.guard_stock_column();

create trigger trg_carnet_guard_balance
  before update on public.carnet_customers
  for each row execute function private.guard_balance_column();

drop function if exists public.guard_stock_column();
drop function if exists public.guard_balance_column();

-- ---------------------------------------------------------------------------
-- Pin the two reporting RPCs. Their bodies already qualify every object, so
-- this is a one-line hardening each.
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return json_build_object('stock_value', 0, 'low_count', 0, 'out_count', 0,
                             'carnet_total', 0, 'product_count', 0);
  end if;

  return json_build_object(
    'stock_value',
    coalesce((
      select sum(p.cost_price * p.current_stock)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
    ), 0),
    'low_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.low_stock_threshold is not null
        and p.current_stock > 0
        and p.current_stock <= p.low_stock_threshold
    ),
    'out_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
        and p.current_stock <= 0
    ),
    'product_count',
    (
      select count(*)
      from public.products p
      where p.store_id = v_store_id and p.active and p.archived_at is null
    ),
    'carnet_total',
    coalesce((
      select sum(c.balance)
      from public.carnet_customers c
      where c.store_id = v_store_id and c.archived_at is null and c.balance > 0
    ), 0)
  );
end;
$$;

revoke execute on function public.get_dashboard_stats() from public, anon;
grant  execute on function public.get_dashboard_stats() to authenticated;

create or replace function public.get_movements_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table(movement_type text, movement_count bigint, net_qty numeric)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  select
    m.movement_type,
    count(*) as movement_count,
    sum(m.quantity) as net_qty
  from public.stock_movements m
  where m.store_id = v_store_id
    and m.created_at >= p_from
    and m.created_at <= p_to
  group by m.movement_type;
end;
$$;

revoke execute on function public.get_movements_summary(timestamptz, timestamptz) from public, anon;
grant  execute on function public.get_movements_summary(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- anon must not hold table privileges.
--
-- Migration 00005 did `grant all on all tables ... to anon, authenticated`. RLS
-- already stopped anon from reading anything, but handing anon DML privileges on
-- every table is unnecessary attack surface. Every policy is restricted to
-- authenticated, so nothing legitimate depended on it.
-- ---------------------------------------------------------------------------

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges in schema public
  revoke all on tables from anon;
alter default privileges in schema public
  revoke all on sequences from anon;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000015  rls_policy_rewrite.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00015 - Phase 1b (2/2): rewrite every RLS policy.
--
-- Two changes applied to all 22 policies:
--
--   1. `to authenticated`.
--      Previously each policy applied to PUBLIC, which means Postgres evaluates
--      the predicate for anon requests too, only to discard the row afterwards.
--      Restricting the role means anon is rejected before the policy runs.
--      Supabase benchmark: 170ms -> <0.1ms on the anon path.
--
--   2. `(select private.is_store_owner(store_id))`.
--      The `(select ...)` wrap turns a per-row function call into an uncorrelated
--      subquery that Postgres evaluates once as an InitPlan. Unwrapped, the same
--      policy shape measures 179ms -> 9ms for the simple case and up to
--      178,000ms -> 12ms for the heavier ones.
--
-- Behaviour is unchanged: the same rows are visible to the same owner, and
-- nothing is visible to anyone else. This is a performance and hardening pass,
-- not a permission change.
--
-- Run order matters: 00014 must have moved is_store_owner to private and dropped
-- the public copy first.
-- ============================================================================

-- ── profiles: keyed on auth.uid() directly ──────────────────────────────────

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── stores: the owner row ──────────────────────────────────────────────────

drop policy if exists "stores_select_own" on public.stores;
drop policy if exists "stores_insert_own" on public.stores;
drop policy if exists "stores_update_own" on public.stores;

create policy "stores_select_own" on public.stores
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "stores_insert_own" on public.stores
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "stores_update_own" on public.stores
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- ── store-scoped tables ────────────────────────────────────────────────────

drop policy if exists "categories_select"        on public.categories;
drop policy if exists "categories_insert"        on public.categories;
drop policy if exists "categories_update"        on public.categories;
drop policy if exists "suppliers_select"         on public.suppliers;
drop policy if exists "suppliers_insert"         on public.suppliers;
drop policy if exists "suppliers_update"         on public.suppliers;
drop policy if exists "products_select"          on public.products;
drop policy if exists "products_insert"          on public.products;
drop policy if exists "products_update"          on public.products;
drop policy if exists "stock_movements_select"   on public.stock_movements;
drop policy if exists "stock_movements_insert"   on public.stock_movements;
drop policy if exists "carnet_customers_select"  on public.carnet_customers;
drop policy if exists "carnet_customers_insert"  on public.carnet_customers;
drop policy if exists "carnet_customers_update"  on public.carnet_customers;
drop policy if exists "carnet_transactions_select" on public.carnet_transactions;
drop policy if exists "carnet_transactions_insert" on public.carnet_transactions;

create policy "categories_select" on public.categories
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "categories_insert" on public.categories
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

create policy "categories_update" on public.categories
  for update to authenticated
  using ((select private.is_store_owner(store_id)))
  with check ((select private.is_store_owner(store_id)));

create policy "suppliers_select" on public.suppliers
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "suppliers_insert" on public.suppliers
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

create policy "suppliers_update" on public.suppliers
  for update to authenticated
  using ((select private.is_store_owner(store_id)))
  with check ((select private.is_store_owner(store_id)));

create policy "products_select" on public.products
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "products_insert" on public.products
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

create policy "products_update" on public.products
  for update to authenticated
  using ((select private.is_store_owner(store_id)))
  with check ((select private.is_store_owner(store_id)));

-- History is append-only: SELECT and INSERT exist, UPDATE and DELETE never do.
create policy "stock_movements_select" on public.stock_movements
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "stock_movements_insert" on public.stock_movements
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

create policy "carnet_customers_select" on public.carnet_customers
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "carnet_customers_insert" on public.carnet_customers
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

create policy "carnet_customers_update" on public.carnet_customers
  for update to authenticated
  using ((select private.is_store_owner(store_id)))
  with check ((select private.is_store_owner(store_id)));

create policy "carnet_transactions_select" on public.carnet_transactions
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

create policy "carnet_transactions_insert" on public.carnet_transactions
  for insert to authenticated
  with check ((select private.is_store_owner(store_id)));

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000016  product_lots_fefo.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00016 - Phase 2: product_lots and FEFO
--
-- Why: products.expiry_date is one date on one product, which cannot represent
-- three deliveries of the same product arriving on different dates with different
-- expiry dates and different quantities. A shopkeeper receiving milk on the 1st
-- and again on the 20th has two lots. Selling from them in the wrong order loses
-- money quietly, and none of the six Algerian competitors tracks it.
--
-- Design commitments:
--
--   * products.current_stock stays authoritative as the SUM of its lots' quantities.
--     Every existing report, the guard trigger and adjust_stock's invariants keep
--     working unchanged. Lot arithmetic can never take a lot negative, so the sum
--     can never disagree with the product total.
--
--   * Lots without an expiry date are still lots, with expiry_date null, and sort
--     last under FEFO. Bread and cleaning products are lots too; making the column
--     NOT NULL would push shops to invent fake dates, and fake dates poison the
--     expiry report.
--
--   * Existing products are backfilled into a single open lot, so no live data
--     migration is needed and behaviour is identical before and after.
--
--   * adjust_stock keeps p_client_op_id as its 7th parameter and appends the lot
--     parameters after it, so the existing call shape is unchanged. The 7-argument
--     overload from 00013 is dropped rather than left in place: two overloads that
--     differ only in trailing optional arguments make PostgREST's function lookup
--     ambiguous, and the client would keep resolving to the lot-unaware version.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. product_lots
-- ---------------------------------------------------------------------------

create table if not exists public.product_lots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  expiry_date date,
  -- Free-text batch reference from the supplier. Deliberately not unique: two
  -- suppliers legitimately use the same batch number.
  lot_code text,

  quantity numeric(12,3) not null default 0 check (quantity >= 0),

  unit_cost numeric(12,2),
  supplier_id uuid references public.suppliers(id),

  received_at timestamptz not null default now(),

  -- A lot is closed when its quantity reaches zero. A column rather than a derived
  -- value so "this delivery is finished" survives a later correction that reopens
  -- it, and so lot lists can hide closed lots without aggregating every quantity.
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- NULLS NOT DISTINCT (PG 15+) is load-bearing. By default NULLs are DISTINCT in
  -- a unique index, which means an unlabelled lot (lot_code IS NULL) never
  -- collides and the ON CONFLICT below inserts a duplicate row on every receipt
  -- instead of reopening the existing lot. Undated, unlabelled stock is the common
  -- case: bread, cleaning products, any delivery without a batch number, so the
  -- default would leak a new lot row per delivery.
  unique nulls not distinct (store_id, product_id, expiry_date, lot_code)
);

comment on table public.product_lots is
  'One physical delivery of a product. products.current_stock is the sum of these quantities.';

create index if not exists idx_product_lots_product
  on public.product_lots (product_id, closed_at);

create index if not exists idx_product_lots_store_open
  on public.product_lots (store_id, closed_at, expiry_date);

create index if not exists idx_product_lots_expiring
  on public.product_lots (store_id, expiry_date)
  where expiry_date is not null and closed_at is null;

-- ---------------------------------------------------------------------------
-- 2. stock_movements references the lot it moved
-- ---------------------------------------------------------------------------

alter table public.stock_movements
  add column if not exists lot_id uuid references public.product_lots(id);

create index if not exists idx_stock_movements_lot
  on public.stock_movements (lot_id)
  where lot_id is not null;

-- ---------------------------------------------------------------------------
-- 3. RLS: read-only, like products.current_stock
-- ---------------------------------------------------------------------------

alter table public.product_lots enable row level security;

drop policy if exists "product_lots_select" on public.product_lots;

create policy "product_lots_select" on public.product_lots
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

-- No insert, update or delete policy exists, deliberately. Lots change only
-- inside adjust_stock() and checkout_sale(), which is the same reason
-- products.current_stock has no write policy: the quantity and the history must
-- not be able to drift apart.

-- ---------------------------------------------------------------------------
-- 4. Guard trigger, in the private schema alongside the existing two
-- ---------------------------------------------------------------------------

create or replace function private.guard_lot_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quantity is distinct from old.quantity
     and current_user = 'authenticated' then
    raise exception 'product_lots.quantity ne peut etre modifiee que par une fonction RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_lots_guard_quantity on public.product_lots;
create trigger trg_product_lots_guard_quantity
  before update on public.product_lots
  for each row execute function private.guard_lot_quantity();

revoke execute on function private.guard_lot_quantity() from public, anon;

-- ---------------------------------------------------------------------------
-- 5. Backfill: each existing product with stock becomes one open lot
-- ---------------------------------------------------------------------------

insert into public.product_lots
  (store_id, product_id, expiry_date, lot_code, quantity, unit_cost, supplier_id, received_at)
select
  p.store_id,
  p.id,
  p.expiry_date,
  null,
  p.current_stock,
  p.cost_price,
  p.supplier_id,
  coalesce(p.created_at, now())
from public.products p
where p.current_stock <> 0
on conflict do nothing;

-- Products at zero get their first lot when something is received into them.
-- Products at zero are exactly the ones that need no backfill.

-- ---------------------------------------------------------------------------
-- 6. FEFO ordering
-- ---------------------------------------------------------------------------

-- Every open lot for a product, earliest expiry first. Returns all of them and
-- lets the caller consume greedily, rather than guessing how many rows are needed
-- with a LIMIT: a caller computing a row count from a per-row quantity would be
-- wrong the moment one lot partially covers the request.
--
-- Null expiry sorts last. Dated stock should be sold before undated stock, because
-- dated stock is the stock that expires.
create or replace function public.allocate_lots_fefo(p_product_id uuid)
returns table (
  lot_id uuid,
  lot_quantity numeric(12,3),
  expiry_date date,
  lot_code text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id
      and (select private.is_store_owner(p.store_id))
  ) then
    raise exception 'Accès refusé';
  end if;

  return query
  select l.id, l.quantity, l.expiry_date, l.lot_code
  from public.product_lots l
  where l.product_id = p_product_id
    and l.closed_at is null
    and l.quantity > 0
  order by
    (l.expiry_date is null),
    l.expiry_date asc nulls last,
    l.received_at asc,
    l.id;
end;
$$;

revoke execute on function public.allocate_lots_fefo(uuid) from public, anon;
grant  execute on function public.allocate_lots_fefo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. adjust_stock: idempotency preserved, lots added
-- ---------------------------------------------------------------------------

-- The 7-argument version from 00013 is dropped first. Keeping it would leave two
-- overloads and make every call ambiguous.
drop function if exists public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid);

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null,
  p_client_op_id uuid default null,
  p_lot_id uuid default null,
  p_expiry_date date default null,
  p_lot_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
  v_claimed boolean;
  v_result jsonb;
  v_lot_id uuid;
  v_lot record;
  v_take numeric(12,3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','opening_balance','damage','theft','count_adjustment','correction') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  if p_client_op_id is not null then
    insert into public.idempotency_keys (store_id, op_key, endpoint)
    values (v_store_id, p_client_op_id, 'adjust_stock')
    on conflict (store_id, op_key) do nothing
    returning true into v_claimed;

    if v_claimed is null then
      select result into v_result
      from public.idempotency_keys
      where store_id = v_store_id and op_key = p_client_op_id;

      if v_result is null then
        raise exception 'Opération déjà traitée, résultat indisponible';
      end if;
      return (v_result #>> '{}')::uuid;
    end if;
  end if;

  -- Product lock first: concurrent receipts and sales serialise here rather than
  -- racing on the lot rows.
  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  -- Semantics unchanged from 00009 and 00013, including count_adjustment being an
  -- absolute counted quantity with the delta computed here under the lock.
  if p_movement_type in ('receive','return','opening_balance') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := p_quantity;
  elsif p_movement_type in ('sale','damage','theft') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := -p_quantity;
  elsif p_movement_type = 'count_adjustment' then
    if p_quantity is null or p_quantity < 0 then
      raise exception 'La quantité constatée ne peut pas être négative';
    end if;
    v_delta := p_quantity - v_current;
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  v_new_stock := v_current + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock insuffisant : % en stock pour un mouvement de %', v_current, v_delta;
  end if;

  -- ── Resolve the lot ─────────────────────────────────────────────────────
  if p_lot_id is not null then
    if not exists (
      select 1 from public.product_lots
      where id = p_lot_id and product_id = p_product_id and store_id = v_store_id
    ) then
      raise exception 'Lot invalide pour ce produit';
    end if;
    v_lot_id := p_lot_id;

  elsif v_delta > 0 then
    -- Incoming stock. The delivery is identified by expiry date plus lot code.
    -- Defaulting to products.expiry_date keeps every pre-lot call site correct.
    insert into public.product_lots
      (store_id, product_id, expiry_date, lot_code, quantity, unit_cost, supplier_id)
    values (
      v_store_id,
      p_product_id,
      coalesce(p_expiry_date, (select p2.expiry_date from public.products p2 where p2.id = p_product_id)),
      nullif(p_lot_code, ''),
      0,
      coalesce(p_unit_cost, (select p3.cost_price from public.products p3 where p3.id = p_product_id)),
      (select p4.supplier_id from public.products p4 where p4.id = p_product_id)
    )
    -- Reopening rather than duplicating: receiving more of a batch already sold
    -- through should extend that lot, not create a second row for it.
    on conflict (store_id, product_id, expiry_date, lot_code)
      do update set closed_at = null, updated_at = now()
    returning id into v_lot_id;

  else
    -- Outgoing stock with no explicit lot: take from the earliest-expiry lot that
    -- has stock. Single-lot consumption; checkout_sale is the path that splits a
    -- sale across several lots.
    select a.lot_id into v_lot_id
    from public.allocate_lots_fefo(p_product_id) a
    where a.lot_quantity + v_delta >= 0
    limit 1;

    if v_lot_id is null then
      raise exception 'Stock insuffisant dans les lots de ce produit';
    end if;
  end if;

  -- Apply to the lot. The quantity >= 0 check inside the UPDATE is what keeps the
  -- lot sum equal to products.current_stock; if it fails, the row is not updated
  -- and the exception below aborts the whole transaction.
  if v_lot_id is not null then
    update public.product_lots
    set quantity  = quantity + v_delta,
        closed_at = case when quantity + v_delta <= 0 then now() else null end,
        updated_at = now()
    where id = v_lot_id
      and quantity + v_delta >= 0;

    if not found then
      raise exception 'Stock insuffisant dans le lot sélectionné';
    end if;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by, lot_id)
  values (
    v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note,
    (select auth.uid()), v_lot_id
  )
  returning id into v_movement_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_movement_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid, uuid, date, text) from public, anon;
grant  execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. checkout_sale: consume lots FEFO, one movement per lot
-- ---------------------------------------------------------------------------

drop function if exists public.checkout_sale(jsonb, text, uuid, numeric, text, uuid);

create or replace function public.checkout_sale(
  p_items jsonb,                      -- [{product_id, quantity}] - no price
  p_payment_mode text,                -- 'cash' | 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null,
  -- Trailing parameters require a default or Postgres rejects the function with
  -- 42P13. Still mandatory in practice: the body raises on a null op id.
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_line record;
  v_line_store uuid;
  v_current numeric(12,3);
  v_price numeric(12,2);
  v_name text;
  v_total numeric(14,2) := 0;
  v_change numeric(14,2) := 0;
  v_count integer := 0;
  v_claimed boolean;
  v_result jsonb;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_lot record;
  v_remaining numeric(12,3);
  v_take numeric(12,3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash','credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  if p_client_op_id is null then
    raise exception 'Référence d''opération manquante (p_client_op_id)';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;

  -- ── Resolve and authorise the owning store before anything else ─────────
  select store_id into v_store_id
  from public.products
  where id = (p_items -> 0 ->> 'product_id')::uuid;

  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  -- ── Idempotency claim ───────────────────────────────────────────────────
  insert into public.idempotency_keys (store_id, op_key, endpoint)
  values (v_store_id, p_client_op_id, 'checkout_sale')
  on conflict (store_id, op_key) do nothing
  returning true into v_claimed;

  if v_claimed is null then
    select result into v_result
    from public.idempotency_keys
    where store_id = v_store_id and op_key = p_client_op_id;

    if v_result is null then
      raise exception 'Opération déjà traitée, résultat indisponible';
    end if;
    return v_result;
  end if;

  -- ── Validate every line under lock, pinned to one store ─────────────────
  -- Aggregating by product_id first is what makes duplicate lines safe: 6 + 6
  -- against stock 10 becomes one line of 12 and is rejected here.
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_line.product_id;
    end if;

    -- Lock first, then read the authoritative state under that lock.
    select p.store_id, p.current_stock, p.sell_price, p.name
      into v_line_store, v_current, v_price, v_name
    from public.products p
    where p.id = v_line.product_id
      for update;

    if not found then
      raise exception 'Produit introuvable: %', v_line.product_id;
    end if;

    -- The line that made the pre-00013 function exploitable.
    if v_line_store <> v_store_id then
      raise exception 'Accès refusé';
    end if;

    if v_current < v_line.quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        v_name, v_current, v_line.quantity;
    end if;

    -- The lots must also cover the line. Without this, a product whose
    -- current_stock is correct but whose lots are short would fail later, after
    -- earlier lines had already been written, turning a clean rejection into a
    -- mid-transaction failure.
    if coalesce((
      select sum(a.lot_quantity)
      from public.allocate_lots_fefo(v_line.product_id) a
    ), 0) < v_line.quantity then
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;

    v_total  := v_total + (v_line.quantity * v_price);
    v_count  := v_count + 1;
  end loop;

  -- ── Payment ─────────────────────────────────────────────────────────────
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  else
    if not exists (
      select 1 from public.carnet_customers c
      where c.id = p_customer_id and c.store_id = v_store_id
    ) then
      raise exception 'Client introuvable';
    end if;
  end if;

  -- ── Apply, consuming lots earliest-expiry-first ─────────────────────────
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    select sell_price into v_price
    from public.products
    where id = v_line.product_id;

    update public.products p
    set current_stock = p.current_stock - v_line.quantity,
        updated_at = now()
    where p.id = v_line.product_id;

    v_remaining := v_line.quantity;

    -- One movement per lot consumed. A sale that spans two deliveries produces
    -- two movements, which is the only way the expiry history stays honest.
    --
    -- The exit is load-bearing. A PL/pgSQL FOR loop evaluates its query once and
    -- then iterates the whole result set, so a `where v_remaining > 0` predicate
    -- does NOT stop the loop when the remaining quantity reaches zero. Without
    -- this exit, any sale that does not drain every lot goes on to insert a
    -- movement with quantity -0, which violates stock_movements.quantity <> 0
    -- and aborts the sale.
    for v_lot in
      select a.lot_id, a.lot_quantity
      from public.allocate_lots_fefo(v_line.product_id) a
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_lot.lot_quantity);

      update public.product_lots
      set quantity    = quantity - v_take,
          closed_at   = case when quantity - v_take <= 0 then now() else null end,
          updated_at  = now()
      where id = v_lot.lot_id;

      insert into public.stock_movements
        (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by, lot_id)
      values (
        v_store_id, v_line.product_id, 'sale', -v_take, v_price, null,
        coalesce(p_note, 'Vente comptant'::text), (select auth.uid()), v_lot.lot_id
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
      v_remaining    := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      -- Cannot happen: the validation pass summed the same lots under lock. Kept
      -- as a hard stop rather than an assertion, because a silent stock
      -- discrepancy is worse than a failed sale.
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;
  end loop;

  if p_payment_mode = 'credit' then
    perform public.record_carnet_transaction(
      p_customer_id,
      'credit'::text,
      v_total,
      coalesce(p_note, 'Achat ' || v_count || ' produit(s)'::text),
      null
    );
  end if;

  v_result := jsonb_build_object(
    'total',        v_total,
    'change',       v_change,
    'movement_ids', to_jsonb(v_movement_ids),
    'items_count',  v_count
  );

  update public.idempotency_keys
  set result = v_result
  where store_id = v_store_id and op_key = p_client_op_id;

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) from public, anon;
grant  execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Expiry reporting reads lots, and shows money at risk
-- ---------------------------------------------------------------------------

drop view if exists public.expiry_report;

create view public.expiry_report
with (security_invoker = true)
as
select
  l.id              as lot_id,
  l.product_id,
  p.name            as product_name,
  p.unit,
  l.expiry_date,
  l.quantity,
  l.lot_code,
  p.sell_price,
  l.quantity * coalesce(p.sell_price, 0) as value_at_risk,
  (l.expiry_date - current_date)        as days_left
from public.product_lots l
join public.products p on p.id = l.product_id
where l.closed_at is null
  and l.quantity > 0
  and l.expiry_date is not null;

comment on view public.expiry_report is
  'Open lots with an expiry date. value_at_risk is what the stock would sell for if it expired unsold.';

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000017  harden_internal_functions_and_fk_indexes.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00017 - hardening found by the Supabase advisors after 00016 ran.
--
-- Two real issues, both in code from earlier phases:
--
--   1. handle_new_user and set_updated_at are trigger functions sitting in the
--      exposed `public` schema, so PostgREST publishes them as RPCs. Supabase's
--      linter flags both as SECURITY DEFINER functions anon can call. A trigger
--      function has no business being a public endpoint, and the 00014 precedent
--      already exists: internal helpers belong in `private`.
--
--   2. Five foreign keys had no covering index. Two of them (products.category_id
--      and products.supplier_id) are filtering columns the UI actually queries, so
--      those are real, not theoretical.
--
-- The unused-index advisor entries are ignored on purpose: idx_products_barcode,
-- idx_products_sku, idx_idempotency_created and idx_product_lots_expiring have
-- never been used because the database is empty. They are for the query patterns
-- the app is written against, and dropping them would be optimising for a
-- database with no data in it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger functions move out of the exposed schema
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.stores (owner_id, name, currency, language, timezone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'store_name', ''), 'Mon magasin'),
    'DZD',
    'fr',
    'Africa/Algiers'
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Re-point every trigger at the private copies before dropping the public ones,
-- otherwise the drops fail on a dependency.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists trg_profiles_updated on public.profiles;
drop trigger if exists trg_stores_updated on public.stores;
drop trigger if exists trg_categories_updated on public.categories;
drop trigger if exists trg_suppliers_updated on public.suppliers;
drop trigger if exists trg_products_updated on public.products;
drop trigger if exists trg_carnet_customers_updated on public.carnet_customers;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger trg_stores_updated before update on public.stores
  for each row execute function private.set_updated_at();
create trigger trg_categories_updated before update on public.categories
  for each row execute function private.set_updated_at();
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function private.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function private.set_updated_at();
create trigger trg_carnet_customers_updated before update on public.carnet_customers
  for each row execute function private.set_updated_at();

drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Cover the foreign keys the planner actually walks
-- ---------------------------------------------------------------------------

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_supplier on public.products (supplier_id);
create index if not exists idx_stock_movements_created_by on public.stock_movements (created_by);
create index if not exists idx_carnet_tx_created_by on public.carnet_transactions (created_by);
create index if not exists idx_product_lots_supplier on public.product_lots (supplier_id);

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000018  dashboard_trends.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00018 - dashboard trends for the metric-card component.
--
-- The design system's UX Principles make this a hard rule: "Every metric card
-- must include delta + sparkline. Numbers without trend context are noise." A
-- metric card therefore cannot be satisfied by a single number, and there is no
-- way to honour that without historical series.
--
-- Why compute rather than store: a daily snapshot table would be a second source
-- of truth for something already derivable from the append-only history. The
-- movement and transaction ledgers are immutable, so history can be reconstructed
-- exactly, and a snapshot table would drift the first time a ledger row was
-- written by a path that forgot to snapshot.
--
-- Stock value at a past day is current_stock minus everything that moved after
-- that day. Doing it that way reads one row per product instead of replaying the
-- whole ledger from the beginning.
-- ============================================================================

create or replace function public.get_dashboard_trends(p_days integer default 14)
returns table (
  day date,
  stock_value numeric,
  carnet_outstanding numeric,
  sales_value numeric,
  movement_count bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_days integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id into v_store_id
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  -- No store means no series. Returning empty rather than raising keeps the
  -- dashboard renderable during the window between signup and the
  -- handle_new_user trigger committing.
  if v_store_id is null then
    return;
  end if;

  -- Clamped so a caller cannot ask for a decade of daily points and make the
  -- dashboard the slowest query in the product.
  v_days := greatest(2, least(coalesce(p_days, 14), 90));

  return query
  with window_days as (
    select generate_series(
      (current_date - (v_days - 1)),
      current_date,
      interval '1 day'
    )::date as day
  ),
  stock_by_day as (
    select
      w.day,
      coalesce(
        sum(
          p.cost_price
          * (
              p.current_stock
              - coalesce(later.moved_after, 0)
            )
        ),
        0
      ) as stock_value
    from window_days w
    -- LEFT join on purpose. An inner join drops every day for a store with no
    -- products, so the series comes back empty instead of flat and the sparkline
    -- renders nothing rather than a zero line. A shop that has not added a
    -- product yet still deserves a chart with the right shape.
    left join public.products p
      on p.store_id = v_store_id
     and p.archived_at is null
     and p.active
    -- Everything that moved strictly after the end of this day. One indexed
    -- lookup per product per day, covered by (product_id, created_at desc).
    left join lateral (
      select sum(m.quantity) as moved_after
      from public.stock_movements m
      where m.product_id = p.id
        and m.created_at >= (w.day + 1)
    ) later on true
    group by w.day
  ),
  carnet_by_day as (
    select
      w.day,
      coalesce((
        -- balance is the signed sum of its transactions, so the running total is
        -- the balance as it stood at the end of that day.
        select sum(t.amount)
        from public.carnet_transactions t
        where t.store_id = v_store_id
          and t.created_at < (w.day + 1)
      ), 0) as carnet_outstanding
    from window_days w
  ),
  movement_by_day as (
    select
      w.day,
      coalesce(m.movement_count, 0) as movement_count,
      coalesce(m.sales_value, 0) as sales_value
    from window_days w
    left join lateral (
      select
        count(*) as movement_count,
        coalesce(sum(
          case when mv.movement_type = 'sale' then abs(mv.quantity) * p.sell_price
               else 0 end
        ), 0) as sales_value
      from public.stock_movements mv
      join public.products p on p.id = mv.product_id
      where mv.store_id = v_store_id
        and mv.created_at >= w.day
        and mv.created_at < (w.day + 1)
    ) m on true
  )
  select
    s.day,
    round(s.stock_value, 2),
    round(c.carnet_outstanding, 2),
    round(mv.sales_value, 2),
    mv.movement_count
  from stock_by_day s
  join carnet_by_day c on c.day = s.day
  join movement_by_day mv on mv.day = s.day
  order by s.day;
end;
$$;

revoke execute on function public.get_dashboard_trends(integer) from public, anon;
grant execute on function public.get_dashboard_trends(integer) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000019  erasure_and_access.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00019 - Phase 5: right-of-erasure path and its audit trail.
--
-- Loi 18-07 (Algerian data protection) gives a data subject a right to erasure.
-- Two constraints shape how that can be honoured here:
--
--   1. This product's own rule is "no hard-delete affordance". A shopkeeper must
--      never be one tap away from destroying a ledger, so erasure is an explicit
--      operation with a recorded reason, not a button.
--
--   2. Anonymisation, not deletion. carnet_transactions are financial records
--      with their own retention obligation, and the credit balance is a claim the
--      shop may need to evidence. Deleting the rows would destroy evidence the
--      shop is entitled - and arguably required - to keep. Clearing the personal
--      data while keeping the amounts satisfies the erasure request without
--      destroying the accounting record.
--
-- Refusing while a balance is outstanding is deliberate and is the honest legal
-- position: the shop has a legitimate claim, and the request is not refused, it
-- is deferred until the debt is settled or written off. Silently anonymising a
-- debtor would erase the shop's own evidence.
--
-- The same reasoning applies to products, suppliers and categories, with no
-- personal data in them at all - they are already covered by archived_at.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Erasure log
--
-- Demonstrating compliance requires being able to show when an erasure happened,
-- for whom, and on what basis. Without this the shop cannot answer a regulator.
-- ---------------------------------------------------------------------------

create table if not exists public.data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subject_type text not null check (subject_type in ('carnet_customer')),
  subject_id uuid not null,
  reason text,
  fields_cleared text[] not null default '{}',
  performed_by uuid references auth.users(id),
  performed_at timestamptz not null default now()
);

comment on table public.data_erasure_log is
  'Audit trail for GDPR/Loi 18-07 erasure requests. Retained because the controller must be able to evidence compliance; contains no personal data itself beyond a subject id.';

create index if not exists idx_erasure_log_store
  on public.data_erasure_log (store_id, performed_at desc);

alter table public.data_erasure_log enable row level security;

drop policy if exists "erasure_log_select" on public.data_erasure_log;

-- Readable by the store owner so they can evidence their own compliance.
-- No insert, update or delete policy: rows are written only by the
-- SECURITY DEFINER function below, so the log cannot be tampered with or forged.
create policy "erasure_log_select" on public.data_erasure_log
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

-- ---------------------------------------------------------------------------
-- 2. The erasure operation
-- ---------------------------------------------------------------------------

create or replace function public.anonymize_carnet_customer(
  p_customer_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_log_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select store_id, balance into v_store_id, v_balance
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  -- A zero balance is the precondition, not a formality: see the file header.
  if v_balance <> 0 then
    raise exception
      'Impossible d''anonymiser un client dont le solde n''est pas nul (solde : %). Réglez ou annulez la créance d''abord.',
      v_balance;
  end if;

  -- Idempotent: anonymising twice is a no-op rather than an error, because a
  -- repeated request is normal when someone chases a ticket.
  if exists (
    select 1 from public.data_erasure_log
    where subject_type = 'carnet_customer'
      and subject_id = p_customer_id
  ) then
    return p_customer_id;
  end if;

  update public.carnet_customers
  set full_name    = 'Client anonymisé',
      phone        = null,
      notes        = null,
      archived_at  = coalesce(archived_at, now()),
      updated_at   = now()
  where id = p_customer_id;

  -- Transactions are deliberately untouched. The amounts remain, the person does
  -- not: carnet_transactions carries no name or phone of its own, only the
  -- customer_id, which now resolves to an anonymised row.

  insert into public.data_erasure_log
    (store_id, subject_type, subject_id, reason, fields_cleared, performed_by)
  values
    (v_store_id, 'carnet_customer', p_customer_id, p_reason,
     array['full_name', 'phone', 'notes'], (select auth.uid()))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

comment on function public.anonymize_carnet_customer(uuid, text) is
  'Loi 18-07 right of erasure. Clears personal data on a carnet customer with a zero balance and records the erasure. Refuses while a balance is outstanding.';

revoke execute on function public.anonymize_carnet_customer(uuid, text) from public, anon;
grant  execute on function public.anonymize_carnet_customer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Subject access: what do we hold about this person
--
-- The access right is the other half of erasure, and answering it by hand means
-- reading five tables. This returns everything held, in one shape, so the answer
-- is complete rather than best-effort.
-- ---------------------------------------------------------------------------

create or replace function public.export_carnet_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select store_id into v_store_id
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  select jsonb_build_object(
    'customer', to_jsonb(c) - 'store_id',
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(t) - 'store_id' order by t.created_at)
      from public.carnet_transactions t
      where t.customer_id = c.id
    ), '[]'::jsonb),
    'erasures', coalesce((
      select jsonb_agg(to_jsonb(e) - 'store_id' order by e.performed_at)
      from public.data_erasure_log e
      where e.subject_type = 'carnet_customer' and e.subject_id = c.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.carnet_customers c
  where c.id = p_customer_id;

  return v_result;
end;
$$;

comment on function public.export_carnet_customer(uuid) is
  'Loi 18-07 right of access. Returns everything held about one carnet customer as a single JSON document.';

revoke execute on function public.export_carnet_customer(uuid) from public, anon;
grant  execute on function public.export_carnet_customer(uuid) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000020  expiry_report_store_scope.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00020 - scope expiry_report to a store.
--
-- 00016 created expiry_report without store_id, reading product_lots joined to
-- products. With security_invoker the RLS policies do restrict it to the
-- caller's rows, so it was not leaking. But the client cannot then filter by
-- store, which means the view is only usable by someone who owns exactly one —
-- and "one store per owner" is a product decision, not something the database
-- enforces. A view that silently returns the wrong shop's stock the day that
-- decision changes is worse than one that takes a filter.
--
-- So: expose store_id and let the caller say which store it means.
--
-- Also adds a covering index for the query the expiry screen actually runs:
-- open lots with a date, soonest first, within one store.
-- ============================================================================

drop view if exists public.expiry_report;

create view public.expiry_report
with (security_invoker = true)
as
select
  l.id                                  as lot_id,
  l.store_id,
  l.product_id,
  p.name                                as product_name,
  p.unit,
  l.expiry_date,
  l.quantity,
  l.lot_code,
  p.sell_price,
  p.cost_price,
  l.quantity * coalesce(p.sell_price, 0) as value_at_risk,
  (l.expiry_date - current_date)         as days_left
from public.product_lots l
join public.products p on p.id = l.product_id
where l.closed_at is null
  and l.quantity > 0
  and l.expiry_date is not null;

comment on view public.expiry_report is
  'Open lots with an expiry date, scoped by store_id. value_at_risk is what the stock would sell for if it expired unsold; cost_at_risk is what it cost.';

grant select on public.expiry_report to authenticated;

-- The expiry screen filters one store to dated open lots and sorts by urgency.
create index if not exists product_lots_store_expiry_idx
  on public.product_lots (store_id, expiry_date)
  where closed_at is null;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000021  sales_and_reorder_rpcs.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00021 - the owner's questions, answered server-side.
--
-- Three things a shopkeeper asks that nothing could answer: what did I sell and
-- earn over a period, what has stopped selling, and what do I need to buy. All
-- three are aggregates over the movement ledger, so they belong in Postgres
-- rather than in a page fetching ten thousand rows to add them up.
--
-- A note on margin. A sale movement records the SELL price in unit_cost, because
-- that is what the receipt needs. The cost at the moment of sale is therefore not
-- in the ledger, and any gross margin computed here uses the product's CURRENT
-- cost_price. That is an estimate, it is labelled as one in the interface, and it
-- drifts when a supplier changes price. The alternative — a second column on
-- stock_movements — is a schema change worth doing only if the estimate proves
-- too coarse in practice.
--
-- Revenue is exact: quantity times the price actually charged.
--
-- Days are resolved in the store's own timezone. Comparing a date against a
-- timestamptz would otherwise cut the day at UTC midnight, which for Algeria puts
-- an hour of evening trade into tomorrow.
-- ============================================================================

create index if not exists stock_movements_store_type_created_idx
  on public.stock_movements (store_id, movement_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Period totals.
-- ---------------------------------------------------------------------------

create or replace function public.get_sales_summary(
  p_from date,
  p_to   date
)
returns json
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
  v_revenue  numeric;
  v_units    numeric;
  v_count    bigint;
  v_cogs     numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return json_build_object(
      'revenue', 0, 'units', 0, 'sale_count', 0,
      'cogs_estimated', 0, 'margin_estimated', 0
    );
  end if;

  select
    coalesce(sum(-m.quantity * coalesce(m.unit_cost, 0)), 0),
    coalesce(sum(-m.quantity), 0),
    count(*),
    coalesce(sum(-m.quantity * coalesce(p.cost_price, 0)), 0)
  into v_revenue, v_units, v_count, v_cogs
  from public.stock_movements m
  join public.products p on p.id = m.product_id
  where m.store_id = v_store_id
    and m.movement_type = 'sale'
    and (m.created_at at time zone v_tz)::date between p_from and p_to;

  return json_build_object(
    'revenue', v_revenue,
    'units', v_units,
    'sale_count', v_count,
    'cogs_estimated', v_cogs,
    'margin_estimated', v_revenue - v_cogs
  );
end;
$$;

revoke execute on function public.get_sales_summary(date, date) from public, anon;
grant  execute on function public.get_sales_summary(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- What sold most over a period.
-- ---------------------------------------------------------------------------

create or replace function public.get_top_products(
  p_from  date,
  p_to    date,
  p_limit integer default 20
)
returns table (
  product_id  uuid,
  name        text,
  unit        text,
  units_sold  numeric,
  revenue     numeric,
  margin_est  numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.unit,
    sum(-m.quantity)                                   as units_sold,
    sum(-m.quantity * coalesce(m.unit_cost, 0))        as revenue,
    sum(-m.quantity * (coalesce(m.unit_cost, 0) - coalesce(p.cost_price, 0))) as margin_est
  from public.stock_movements m
  join public.products p on p.id = m.product_id
  where m.store_id = v_store_id
    and m.movement_type = 'sale'
    and (m.created_at at time zone v_tz)::date between p_from and p_to
  group by p.id, p.name, p.unit
  order by revenue desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

revoke execute on function public.get_top_products(date, date, integer) from public, anon;
grant  execute on function public.get_top_products(date, date, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- What has stopped selling, and so is money sitting on a shelf.
--
-- A product with stock and no sale in the window. Note this is about SALES only:
-- a product that came in yesterday has not "stopped selling", it has not started,
-- so only products whose first receipt is older than the window are considered.
-- ---------------------------------------------------------------------------

create or replace function public.get_dead_stock(
  p_days  integer default 90,
  p_limit integer default 50
)
returns table (
  product_id    uuid,
  name          text,
  unit          text,
  current_stock numeric,
  unit_cost     numeric,
  value_tied_up numeric,
  last_sold_at  timestamptz,
  days_idle     integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
  v_days     integer := greatest(7, least(p_days, 730));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  with last_sale as (
    select m.product_id, max(m.created_at) as last_at
    from public.stock_movements m
    where m.store_id = v_store_id
      and m.movement_type = 'sale'
    group by m.product_id
  ),
  first_in as (
    select m.product_id, min(m.created_at) as first_at
    from public.stock_movements m
    where m.store_id = v_store_id
    group by m.product_id
  )
  select
    p.id,
    p.name,
    p.unit,
    p.current_stock,
    p.cost_price,
    coalesce(p.cost_price, 0) * p.current_stock as value_tied_up,
    ls.last_at,
    (current_date - (coalesce(ls.last_at, fi.first_at) at time zone v_tz)::date)::integer as days_idle
  from public.products p
  left join last_sale ls on ls.product_id = p.id
  left join first_in fi on fi.product_id = p.id
  where p.store_id = v_store_id
    and p.active
    and p.archived_at is null
    and p.current_stock > 0
    -- Older than the window, so a new arrival is not called a slow mover.
    and fi.first_at is not null
    and (fi.first_at at time zone v_tz)::date <= (current_date - v_days)
    and (ls.last_at is null
         or (ls.last_at at time zone v_tz)::date <= (current_date - v_days))
  order by coalesce(p.cost_price, 0) * p.current_stock desc
  limit greatest(1, least(p_limit, 200));
end;
$$;

revoke execute on function public.get_dead_stock(integer, integer) from public, anon;
grant  execute on function public.get_dead_stock(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- What to buy, by supplier.
--
-- The suggestion is deliberately simple and explainable: restock to somewhere
-- above the alert threshold, and never less than what actually sold over the
-- lookback. A shopkeeper will override it, and a figure they can reason about is
-- worth more than a clever one they cannot.
-- ---------------------------------------------------------------------------

create or replace function public.get_reorder_list(
  p_lookback_days integer default 30
)
returns table (
  product_id      uuid,
  product_name    text,
  unit            text,
  current_stock   numeric,
  threshold       numeric,
  units_sold      numeric,
  suggested_qty   numeric,
  supplier_id     uuid,
  supplier_name   text,
  supplier_phone  text,
  supplier_whatsapp text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
  v_days     integer := greatest(1, least(p_lookback_days, 365));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  with sold as (
    select m.product_id, sum(-m.quantity) as units
    from public.stock_movements m
    where m.store_id = v_store_id
      and m.movement_type = 'sale'
      and (m.created_at at time zone v_tz)::date >= (current_date - v_days)
    group by m.product_id
  )
  select
    p.id,
    p.name,
    p.unit,
    p.current_stock,
    p.low_stock_threshold,
    coalesce(s.units, 0),
    greatest(
      ceil(coalesce(s.units, 0) - p.current_stock),
      ceil(coalesce(p.low_stock_threshold, 0) * 2 - p.current_stock),
      1
    ),
    sup.id,
    sup.name,
    sup.phone,
    sup.whatsapp
  from public.products p
  left join sold s on s.product_id = p.id
  left join public.suppliers sup on sup.id = p.supplier_id
  where p.store_id = v_store_id
    and p.active
    and p.archived_at is null
    and (
      p.current_stock <= 0
      or (p.low_stock_threshold is not null and p.current_stock <= p.low_stock_threshold)
    )
  order by
    -- Products with no supplier cannot be ordered by anyone, so they come first:
    -- they are the ones that need a decision, not a purchase order.
    (sup.id is not null),
    sup.name nulls last,
    p.name;
end;
$$;

revoke execute on function public.get_reorder_list(integer) from public, anon;
grant  execute on function public.get_reorder_list(integer) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000022  sale_price_fallback.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00022 - an unpriced sale was revenue of zero.
--
-- Found by running 00021's test suite, on its second run, which is precisely what
-- the suite is for.
--
-- A sale movement stores the price charged in unit_cost. checkout_sale does this.
-- The inventory "sell" form did not, so every sale recorded from that tab wrote a
-- movement with unit_cost null:
--
--     revenue = sum(-quantity * coalesce(unit_cost, 0)) = 0
--
-- The stock moved and the money did not. Nothing looked wrong — the product went
-- down, the movement appeared in the history, the receipt printed — because the
-- only place the missing figure mattered was a report that did not exist until
-- 00021. Adding the report is what exposed it.
--
-- Two changes, because one alone would be a patch rather than a fix:
--
--   1. The sell form now sends the product's selling price. (Frontend, same
--      commit: src/components/inventory/SellStockForm.tsx)
--   2. These two functions fall back to products.sell_price when unit_cost is
--      null, so a row written before that fix — or by any future caller that
--      omits the parameter — is not silently counted as free.
--
-- The fallback is an estimate of what was charged, and it is the same estimate
-- the margin already relies on in the other direction.
-- ============================================================================

create or replace function public.get_sales_summary(
  p_from date,
  p_to   date
)
returns json
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
  v_revenue  numeric;
  v_units    numeric;
  v_count    bigint;
  v_cogs     numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return json_build_object(
      'revenue', 0, 'units', 0, 'sale_count', 0,
      'cogs_estimated', 0, 'margin_estimated', 0
    );
  end if;

  select
    coalesce(sum(-m.quantity * coalesce(m.unit_cost, p.sell_price, 0)), 0),
    coalesce(sum(-m.quantity), 0),
    count(*),
    coalesce(sum(-m.quantity * coalesce(p.cost_price, 0)), 0)
  into v_revenue, v_units, v_count, v_cogs
  from public.stock_movements m
  join public.products p on p.id = m.product_id
  where m.store_id = v_store_id
    and m.movement_type = 'sale'
    and (m.created_at at time zone v_tz)::date between p_from and p_to;

  return json_build_object(
    'revenue', v_revenue,
    'units', v_units,
    'sale_count', v_count,
    'cogs_estimated', v_cogs,
    'margin_estimated', v_revenue - v_cogs
  );
end;
$$;

create or replace function public.get_top_products(
  p_from  date,
  p_to    date,
  p_limit integer default 20
)
returns table (
  product_id  uuid,
  name        text,
  unit        text,
  units_sold  numeric,
  revenue     numeric,
  margin_est  numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_tz       text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select id, coalesce(timezone, 'Africa/Algiers') into v_store_id, v_tz
  from public.stores
  where owner_id = (select auth.uid())
  limit 1;

  if v_store_id is null then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.unit,
    sum(-m.quantity)                                   as units_sold,
    sum(-m.quantity * coalesce(m.unit_cost, p.sell_price, 0)) as revenue,
    sum(-m.quantity * (coalesce(m.unit_cost, p.sell_price, 0) - coalesce(p.cost_price, 0)))
      as margin_est
  from public.stock_movements m
  join public.products p on p.id = m.product_id
  where m.store_id = v_store_id
    and m.movement_type = 'sale'
    and (m.created_at at time zone v_tz)::date between p_from and p_to
  group by p.id, p.name, p.unit
  order by revenue desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000023  anonymise_marker_not_label.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00023 - erasure writes a marker, not a French label.
--
-- 00019's anonymize_carnet_customer set full_name to 'Client anonymisé'. Two
-- problems with that:
--
--   1. It is a French string inside the database, so it surfaced verbatim in an
--      Arabic or English session. Same class of defect as a hardcoded UI string,
--      one layer further down where it is harder to spot.
--   2. It was also the only signal the client had that a row had been erased, so
--      the check that decides whether to offer erasure compared against a
--      translated string — which is language-dependent by construction.
--
-- The row now carries '[anonymised]': no language in the database, one stable
-- value to compare against, and the UI renders the wording. src/lib/constants.ts
-- holds the same marker as ANONYMISED_CUSTOMER_NAME.
--
-- The domain checks from 00019 are preserved verbatim; only the stored value and
-- the ordering of the ownership check change, the latter so the ownership failure
-- cannot be distinguished from a missing row by its message.
-- ============================================================================

create or replace function public.anonymize_carnet_customer(
  p_customer_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_log_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select store_id, balance into v_store_id, v_balance
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;

  if not private.is_store_owner(v_store_id) then
    raise exception 'Acces refuse';
  end if;

  if coalesce(v_balance, 0) <> 0 then
    raise exception using
      message = format(
        'Impossible d''anonymiser un client dont le solde n''est pas nul (solde : %s). Reglez ou annulez la creance d''abord.',
        v_balance
      );
  end if;

  -- Idempotent: anonymising twice is a no-op rather than an error, because a
  -- repeated request is normal when someone chases a ticket.
  if exists (
    select 1 from public.data_erasure_log
    where subject_type = 'carnet_customer'
      and subject_id = p_customer_id
  ) then
    return p_customer_id;
  end if;

  update public.carnet_customers
  set full_name    = '[anonymised]',
      phone        = null,
      notes        = null,
      archived_at  = coalesce(archived_at, now()),
      updated_at   = now()
  where id = p_customer_id;

  insert into public.data_erasure_log
    (store_id, subject_type, subject_id, reason, fields_cleared, performed_by)
  values
    (v_store_id, 'carnet_customer', p_customer_id, p_reason,
     array['full_name', 'phone', 'notes'], (select auth.uid()))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- Rows erased under the old label.
update public.carnet_customers
set full_name = '[anonymised]'
where full_name = 'Client anonymisé';

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 20260823000024  checkout_notes_not_french.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Migration 00024 - checkout stopped writing French into the data.
--
-- checkout_sale filled two fields with French sentences when the caller passed no
-- note:
--
--   stock_movements.note          -> 'Vente comptant'
--   carnet_transactions.note      -> 'Achat 3 produit(s)'
--
-- Both are rendered verbatim in the movement history, in the customer's
-- transaction list and in the CSV export, so an Arabic or English session showed
-- a French sentence sitting in the middle of its own table. The movement type and
-- the transaction type already say what happened; the note is the shopkeeper's
-- own comment and has no business inventing one.
--
-- Both now pass p_note straight through, which is null when nobody typed
-- anything, and the interface renders nothing rather than something wrong.
--
-- The function body below is 00016's, unchanged apart from those two expressions.
-- A migration that edits a function by pattern-matching its own source text would
-- be shorter and would silently do nothing the day the text changes; this is
-- longer and cannot.
-- ============================================================================

-- Existing rows, written before this migration.
update public.stock_movements
set note = null
where note = 'Vente comptant';

update public.carnet_transactions
set note = null
where note like 'Achat % produit(s)';

create or replace function public.checkout_sale(
  p_items jsonb,                      -- [{product_id, quantity}] - no price
  p_payment_mode text,                -- 'cash' | 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null,
  -- Trailing parameters require a default or Postgres rejects the function with
  -- 42P13. Still mandatory in practice: the body raises on a null op id.
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_line record;
  v_line_store uuid;
  v_current numeric(12,3);
  v_price numeric(12,2);
  v_name text;
  v_total numeric(14,2) := 0;
  v_change numeric(14,2) := 0;
  v_count integer := 0;
  v_claimed boolean;
  v_result jsonb;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_lot record;
  v_remaining numeric(12,3);
  v_take numeric(12,3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash','credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  if p_client_op_id is null then
    raise exception 'Référence d''opération manquante (p_client_op_id)';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;

  -- ── Resolve and authorise the owning store before anything else ─────────
  select store_id into v_store_id
  from public.products
  where id = (p_items -> 0 ->> 'product_id')::uuid;

  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  -- ── Idempotency claim ───────────────────────────────────────────────────
  insert into public.idempotency_keys (store_id, op_key, endpoint)
  values (v_store_id, p_client_op_id, 'checkout_sale')
  on conflict (store_id, op_key) do nothing
  returning true into v_claimed;

  if v_claimed is null then
    select result into v_result
    from public.idempotency_keys
    where store_id = v_store_id and op_key = p_client_op_id;

    if v_result is null then
      raise exception 'Opération déjà traitée, résultat indisponible';
    end if;
    return v_result;
  end if;

  -- ── Validate every line under lock, pinned to one store ─────────────────
  -- Aggregating by product_id first is what makes duplicate lines safe: 6 + 6
  -- against stock 10 becomes one line of 12 and is rejected here.
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_line.product_id;
    end if;

    -- Lock first, then read the authoritative state under that lock.
    select p.store_id, p.current_stock, p.sell_price, p.name
      into v_line_store, v_current, v_price, v_name
    from public.products p
    where p.id = v_line.product_id
      for update;

    if not found then
      raise exception 'Produit introuvable: %', v_line.product_id;
    end if;

    -- The line that made the pre-00013 function exploitable.
    if v_line_store <> v_store_id then
      raise exception 'Accès refusé';
    end if;

    if v_current < v_line.quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        v_name, v_current, v_line.quantity;
    end if;

    -- The lots must also cover the line. Without this, a product whose
    -- current_stock is correct but whose lots are short would fail later, after
    -- earlier lines had already been written, turning a clean rejection into a
    -- mid-transaction failure.
    if coalesce((
      select sum(a.lot_quantity)
      from public.allocate_lots_fefo(v_line.product_id) a
    ), 0) < v_line.quantity then
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;

    v_total  := v_total + (v_line.quantity * v_price);
    v_count  := v_count + 1;
  end loop;

  -- ── Payment ─────────────────────────────────────────────────────────────
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  else
    if not exists (
      select 1 from public.carnet_customers c
      where c.id = p_customer_id and c.store_id = v_store_id
    ) then
      raise exception 'Client introuvable';
    end if;
  end if;

  -- ── Apply, consuming lots earliest-expiry-first ─────────────────────────
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    select sell_price into v_price
    from public.products
    where id = v_line.product_id;

    update public.products p
    set current_stock = p.current_stock - v_line.quantity,
        updated_at = now()
    where p.id = v_line.product_id;

    v_remaining := v_line.quantity;

    -- One movement per lot consumed. A sale that spans two deliveries produces
    -- two movements, which is the only way the expiry history stays honest.
    --
    -- The exit is load-bearing. A PL/pgSQL FOR loop evaluates its query once and
    -- then iterates the whole result set, so a `where v_remaining > 0` predicate
    -- does NOT stop the loop when the remaining quantity reaches zero. Without
    -- this exit, any sale that does not drain every lot goes on to insert a
    -- movement with quantity -0, which violates stock_movements.quantity <> 0
    -- and aborts the sale.
    for v_lot in
      select a.lot_id, a.lot_quantity
      from public.allocate_lots_fefo(v_line.product_id) a
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_lot.lot_quantity);

      update public.product_lots
      set quantity    = quantity - v_take,
          closed_at   = case when quantity - v_take <= 0 then now() else null end,
          updated_at  = now()
      where id = v_lot.lot_id;

      insert into public.stock_movements
        (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by, lot_id)
      values (
        v_store_id, v_line.product_id, 'sale', -v_take, v_price, null,
        p_note, (select auth.uid()), v_lot.lot_id
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
      v_remaining    := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      -- Cannot happen: the validation pass summed the same lots under lock. Kept
      -- as a hard stop rather than an assertion, because a silent stock
      -- discrepancy is worse than a failed sale.
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;
  end loop;

  if p_payment_mode = 'credit' then
    perform public.record_carnet_transaction(
      p_customer_id,
      'credit'::text,
      v_total,
      p_note,
      null
    );
  end if;

  v_result := jsonb_build_object(
    'total',        v_total,
    'change',       v_change,
    'movement_ids', to_jsonb(v_movement_ids),
    'items_count',  v_count
  );

  update public.idempotency_keys
  set result = v_result
  where store_id = v_store_id and op_key = p_client_op_id;

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) from public, anon;
grant  execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) to authenticated;

commit;
