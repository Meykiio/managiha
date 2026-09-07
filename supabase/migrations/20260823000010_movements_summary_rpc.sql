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