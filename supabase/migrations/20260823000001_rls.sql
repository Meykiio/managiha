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
