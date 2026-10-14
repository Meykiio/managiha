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