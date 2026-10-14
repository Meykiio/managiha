-- ============================================================================
-- Migration 00024 - checkout stopped writing French into the data.
--
-- checkout_sale filled two fields with French sentences when the caller passed no
-- note:
--
--   stock_movements.note          -> 'Vente comptant'
--   carnet_transactions.note      -> 'Achat 3 produit(s)'
--
-- Both are rendered verbatim in the movement history, in the customer's
-- transaction list and in the CSV export, so an Arabic or English session showed
-- a French sentence sitting in the middle of its own table. The movement type and
-- the transaction type already say what happened; the note is the shopkeeper's
-- own comment and has no business inventing one.
--
-- Both now pass p_note straight through, which is null when nobody typed
-- anything, and the interface renders nothing rather than something wrong.
--
-- The function body below is 00016's, unchanged apart from those two expressions.
-- A migration that edits a function by pattern-matching its own source text would
-- be shorter and would silently do nothing the day the text changes; this is
-- longer and cannot.
-- ============================================================================

-- Existing rows, written before this migration.
update public.stock_movements
set note = null
where note = 'Vente comptant';

update public.carnet_transactions
set note = null
where note like 'Achat % produit(s)';

create or replace function public.checkout_sale(
  p_items jsonb,                      -- [{product_id, quantity}] - no price
  p_payment_mode text,                -- 'cash' | 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null,
  -- Trailing parameters require a default or Postgres rejects the function with
  -- 42P13. Still mandatory in practice: the body raises on a null op id.
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_line record;
  v_line_store uuid;
  v_current numeric(12,3);
  v_price numeric(12,2);
  v_name text;
  v_total numeric(14,2) := 0;
  v_change numeric(14,2) := 0;
  v_count integer := 0;
  v_claimed boolean;
  v_result jsonb;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_lot record;
  v_remaining numeric(12,3);
  v_take numeric(12,3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_payment_mode not in ('cash','credit') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_payment_mode = 'credit' and p_customer_id is null then
    raise exception 'Client requis pour un paiement à crédit';
  end if;

  if p_client_op_id is null then
    raise exception 'Référence d''opération manquante (p_client_op_id)';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;

  -- ── Resolve and authorise the owning store before anything else ─────────
  select store_id into v_store_id
  from public.products
  where id = (p_items -> 0 ->> 'product_id')::uuid;

  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  -- ── Idempotency claim ───────────────────────────────────────────────────
  insert into public.idempotency_keys (store_id, op_key, endpoint)
  values (v_store_id, p_client_op_id, 'checkout_sale')
  on conflict (store_id, op_key) do nothing
  returning true into v_claimed;

  if v_claimed is null then
    select result into v_result
    from public.idempotency_keys
    where store_id = v_store_id and op_key = p_client_op_id;

    if v_result is null then
      raise exception 'Opération déjà traitée, résultat indisponible';
    end if;
    return v_result;
  end if;

  -- ── Validate every line under lock, pinned to one store ─────────────────
  -- Aggregating by product_id first is what makes duplicate lines safe: 6 + 6
  -- against stock 10 becomes one line of 12 and is rejected here.
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Quantité invalide pour le produit %', v_line.product_id;
    end if;

    -- Lock first, then read the authoritative state under that lock.
    select p.store_id, p.current_stock, p.sell_price, p.name
      into v_line_store, v_current, v_price, v_name
    from public.products p
    where p.id = v_line.product_id
      for update;

    if not found then
      raise exception 'Produit introuvable: %', v_line.product_id;
    end if;

    -- The line that made the pre-00013 function exploitable.
    if v_line_store <> v_store_id then
      raise exception 'Accès refusé';
    end if;

    if v_current < v_line.quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        v_name, v_current, v_line.quantity;
    end if;

    -- The lots must also cover the line. Without this, a product whose
    -- current_stock is correct but whose lots are short would fail later, after
    -- earlier lines had already been written, turning a clean rejection into a
    -- mid-transaction failure.
    if coalesce((
      select sum(a.lot_quantity)
      from public.allocate_lots_fefo(v_line.product_id) a
    ), 0) < v_line.quantity then
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;

    v_total  := v_total + (v_line.quantity * v_price);
    v_count  := v_count + 1;
  end loop;

  -- ── Payment ─────────────────────────────────────────────────────────────
  if p_payment_mode = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Montant reçu insuffisant: % reçu, % total',
        coalesce(p_amount_received, 0), v_total;
    end if;
    v_change := p_amount_received - v_total;
  else
    if not exists (
      select 1 from public.carnet_customers c
      where c.id = p_customer_id and c.store_id = v_store_id
    ) then
      raise exception 'Client introuvable';
    end if;
  end if;

  -- ── Apply, consuming lots earliest-expiry-first ─────────────────────────
  for v_line in
    select
      (line ->> 'product_id')::uuid          as product_id,
      sum((line ->> 'quantity')::numeric)    as quantity
    from jsonb_array_elements(p_items) as line
    group by 1
    order by 1
  loop
    select sell_price into v_price
    from public.products
    where id = v_line.product_id;

    update public.products p
    set current_stock = p.current_stock - v_line.quantity,
        updated_at = now()
    where p.id = v_line.product_id;

    v_remaining := v_line.quantity;

    -- One movement per lot consumed. A sale that spans two deliveries produces
    -- two movements, which is the only way the expiry history stays honest.
    --
    -- The exit is load-bearing. A PL/pgSQL FOR loop evaluates its query once and
    -- then iterates the whole result set, so a `where v_remaining > 0` predicate
    -- does NOT stop the loop when the remaining quantity reaches zero. Without
    -- this exit, any sale that does not drain every lot goes on to insert a
    -- movement with quantity -0, which violates stock_movements.quantity <> 0
    -- and aborts the sale.
    for v_lot in
      select a.lot_id, a.lot_quantity
      from public.allocate_lots_fefo(v_line.product_id) a
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_lot.lot_quantity);

      update public.product_lots
      set quantity    = quantity - v_take,
          closed_at   = case when quantity - v_take <= 0 then now() else null end,
          updated_at  = now()
      where id = v_lot.lot_id;

      insert into public.stock_movements
        (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by, lot_id)
      values (
        v_store_id, v_line.product_id, 'sale', -v_take, v_price, null,
        p_note, (select auth.uid()), v_lot.lot_id
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
      v_remaining    := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      -- Cannot happen: the validation pass summed the same lots under lock. Kept
      -- as a hard stop rather than an assertion, because a silent stock
      -- discrepancy is worse than a failed sale.
      raise exception 'Stock insuffisant dans les lots pour %', v_name;
    end if;
  end loop;

  if p_payment_mode = 'credit' then
    perform public.record_carnet_transaction(
      p_customer_id,
      'credit'::text,
      v_total,
      p_note,
      null
    );
  end if;

  v_result := jsonb_build_object(
    'total',        v_total,
    'change',       v_change,
    'movement_ids', to_jsonb(v_movement_ids),
    'items_count',  v_count
  );

  update public.idempotency_keys
  set result = v_result
  where store_id = v_store_id and op_key = p_client_op_id;

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) from public, anon;
grant  execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) to authenticated;
