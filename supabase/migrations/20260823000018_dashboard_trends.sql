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
