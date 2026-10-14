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
