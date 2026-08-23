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
