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
