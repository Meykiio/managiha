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