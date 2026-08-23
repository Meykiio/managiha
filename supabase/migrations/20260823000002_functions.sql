create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  else
    if p_quantity is null or p_quantity = 0 then
      raise exception 'La quantité ne peut pas être nulle';
    end if;
    v_delta := p_quantity;
  end if;

  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

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

create or replace function public.record_carnet_transaction(
  p_customer_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_signed numeric(12,2);
  v_tx_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if p_type not in ('credit','payment','adjustment') then
    raise exception 'Type de transaction invalide';
  end if;

  select store_id, balance into v_store_id, v_balance
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;
  if not public.is_store_owner(v_store_id) then
    raise exception 'Accès refusé';
  end if;

  if p_type in ('credit','payment') then
    if p_amount is null or p_amount <= 0 then
      raise exception 'Le montant doit être supérieur à 0';
    end if;
    if p_type = 'credit' then
      v_signed := p_amount;
    else
      v_signed := -p_amount;
    end if;
  else
    if p_amount is null or p_amount = 0 then
      raise exception 'Le montant ne peut pas être nul';
    end if;
    v_signed := p_amount;
  end if;

  select balance into v_balance
  from public.carnet_customers
  where id = p_customer_id
  for update;

  v_new_balance := v_balance + v_signed;

  update public.carnet_customers
  set balance = v_new_balance, updated_at = now()
  where id = p_customer_id;

  insert into public.carnet_transactions
    (store_id, customer_id, type, amount, note, created_by)
  values
    (v_store_id, p_customer_id, p_type, v_signed, p_note, auth.uid())
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

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
    return json_build_object('stock_value', 0, 'low_count', 0, 'out_count', 0, 'carnet_total', 0);
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
    'carnet_total',
    coalesce((
      select sum(c.balance)
      from public.carnet_customers c
      where c.store_id = v_store_id and c.archived_at is null and c.balance > 0
    ), 0)
  );
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text) from public, anon;
revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
