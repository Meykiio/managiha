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

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'product-images';

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
