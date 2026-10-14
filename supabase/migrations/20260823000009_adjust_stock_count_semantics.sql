create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;
  if not public.is_store_owner(v_store_id) then
    raise exception 'Accès refusé';
  end if;

  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  if p_movement_type in ('receive','return','opening_balance') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := p_quantity;
  elsif p_movement_type in ('sale','damage','theft') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'La quantité doit être supérieure à 0';
    end if;
    v_delta := -p_quantity;
  elsif p_movement_type = 'count_adjustment' then
    if p_quantity is null or p_quantity < 0 then
      raise exception 'La quantité constatée ne peut pas être négative';
    end if;
    v_delta := p_quantity - v_current;
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  v_new_stock := v_current + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock insuffisant : % en stock pour un mouvement de %', v_current, v_delta;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
  values
    (v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note, auth.uid())
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;

notify pgrst, 'reload schema';
