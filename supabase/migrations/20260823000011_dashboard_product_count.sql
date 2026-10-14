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