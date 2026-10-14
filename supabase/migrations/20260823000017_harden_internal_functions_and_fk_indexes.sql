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
