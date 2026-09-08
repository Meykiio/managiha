-- Atomic checkout: process all items in one transaction
-- Prevents partial sales and double stock decrements

create or replace function public.checkout_sale(
  p_items jsonb, -- [{product_id, quantity, unit_price}]
  p_payment_mode text, -- 'cash' or 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total numeric := 0;
  v_change numeric := 0;
  v_movement_ids uuid[] := '{}';
  v_movement_id uuid;
  v_current numeric(12,3);
  v_new_stock numeric(12,3);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash', 'credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  -- Validate all items first (before any stock changes)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_product_id;
    end if;

    -- Get store_id from first product (all items must be from same store)
    if v_store_id is null then
      select store_id into v_store_id from public.products where id = v_product_id;
      if v_store_id is null then
        raise exception 'Produit introuvable: %', v_product_id;
      end if;
      if not public.is_store_owner(v_store_id) then
        raise exception 'Accès refusé';
      end if;
    end if;

    -- Check stock availability (with row lock)
    select current_stock into v_current
    from public.products
    where id = v_product_id
    for update;

    if v_current < v_quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        (select name from public.products where id = v_product_id),
        v_current, v_quantity;
    end if;

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  -- Validate payment
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  end if;

  -- Process all items (stock decrements)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;

    -- Decrement stock
    update public.products
    set current_stock = current_stock - v_quantity, updated_at = now()
    where id = v_product_id
    returning current_stock into v_new_stock;

    -- Record movement
    insert into public.stock_movements
      (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
    values
      (v_store_id, v_product_id, 'sale', -v_quantity, v_unit_price, null,
       coalesce(p_note, 'Vente ' || p_payment_mode), auth.uid())
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
  end loop;

  -- Record carnet transaction for credit sales
  if p_payment_mode = 'credit' then
    insert into public.carnet_transactions
      (store_id, customer_id, type, amount, note, created_by)
    values
      (v_store_id, p_customer_id, 'credit', v_total,
       coalesce(p_note, 'Achat ' || jsonb_array_length(p_items) || ' produit(s)'), auth.uid());
  end if;

  v_result := jsonb_build_object(
    'total', v_total,
    'change', v_change,
    'movement_ids', v_movement_ids,
    'items_count', jsonb_array_length(p_items)
  );

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text) from public, anon;
grant execute on function public.checkout_sale(jsonb, text, uuid, numeric, text) to authenticated;

notify pgrst, 'reload schema';
