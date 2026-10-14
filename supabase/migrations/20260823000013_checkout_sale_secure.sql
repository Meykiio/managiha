-- ============================================================================
-- Migration 00013 - Phase 1a: secure checkout_sale + write idempotency
--
-- Fixes, in order of severity:
--
--   1. CROSS-TENANT WRITE. checkout_sale verified ownership only for the first
--      cart line (`if v_store_id is null`). Lines 2..n were never checked, so an
--      authenticated user could pass their own product first, then a victim's
--      product id, and decrement another store's stock.
--      Fix: every line is locked, ownership-checked and pinned to one store_id.
--
--   2. CREDIT SALES NEVER UPDATED THE BALANCE. checkout_sale inserted directly
--      into carnet_transactions instead of calling record_carnet_transaction, so
--      carnet_customers.balance stayed stale forever.
--      Fix: the credit path now delegates to record_carnet_transaction.
--
--   3. DUPLICATE LINES COULD DRIVE STOCK NEGATIVE. Stock was validated per line
--      but decremented in a second loop: two lines of 6 against stock 10 both
--      passed validation and then produced -2.
--      Fix: lines are aggregated by product_id before any validation.
--
--   4. CLIENT-SUPPLIED PRICE WAS TRUSTED. p_items[].unit_price came from the
--      browser and drove both the total and the movement unit_cost.
--      Fix: price is read from products.sell_price. The parameter is removed.
--
--   5. NO IDEMPOTENCY. A retry, a double tap or a flaky connection silently
--      double-decremented stock.
--      Fix: idempotency_keys, claimed inside the same transaction as the writes.
--
--   6. THE CREDIT CUSTOMER WAS NEVER CHECKED. Any authenticated user could post
--      a carnet transaction onto another store's customer.
--      Fix: the customer must belong to the caller's store.
--
-- Phase 2 extends checkout_sale with FEFO lot consumption and keeps this
-- signature as its contract.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Idempotency ledger.
-- RLS enabled with zero policies, so no client can read or write it. Only the
-- SECURITY DEFINER RPCs below have access. That is intentional: the table is
-- internal bookkeeping, not user data.
-- ---------------------------------------------------------------------------

create table if not exists public.idempotency_keys (
  store_id   uuid        not null references public.stores(id) on delete cascade,
  op_key     uuid        not null,
  endpoint   text        not null,
  result     jsonb,
  created_at timestamptz not null default now(),
  primary key (store_id, op_key)
);

alter table public.idempotency_keys enable row level security;

create index if not exists idx_idempotency_created
  on public.idempotency_keys (created_at);

comment on table public.idempotency_keys is
  'Replay guard for write RPCs. p_client_op_id claims a row here; repeating the same key returns the stored result instead of applying the write twice.';

-- ===========================================================================
-- record_carnet_transaction: add optional idempotency
--
-- Signature changes (a new trailing parameter with a default), so the old
-- 4-argument overload must be dropped or Postgres would keep two and make
-- calls ambiguous. Existing callers keep working because the 7th/5th argument
-- defaults to null.
--
-- p_client_op_id is nullable on purpose: idempotency is a reliability
-- guarantee, not a security control. Passing null keeps the old behaviour and
-- costs the caller only retry-safety, never isolation.
-- ===========================================================================

drop function if exists public.record_carnet_transaction(uuid, text, numeric, text);

create or replace function public.record_carnet_transaction(
  p_customer_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default null,
  p_client_op_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_signed numeric(12,2);
  v_tx_id uuid;
  v_claimed boolean;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_type not in ('credit','payment','adjustment') then
    raise exception 'Type de transaction invalide';
  end if;

  select store_id into v_store_id
  from public.carnet_customers
  where id = p_customer_id;

  if v_store_id is null then
    raise exception 'Client introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  if p_client_op_id is not null then
    insert into public.idempotency_keys (store_id, op_key, endpoint)
    values (v_store_id, p_client_op_id, 'record_carnet_transaction')
    on conflict (store_id, op_key) do nothing
    returning true into v_claimed;

    if v_claimed is null then
      select result into v_result
      from public.idempotency_keys
      where store_id = v_store_id and op_key = p_client_op_id;

      if v_result is null then
        raise exception 'Opération déjà traitée, résultat indisponible';
      end if;
      return (v_result #>> '{}')::uuid;
    end if;
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
    (v_store_id, p_customer_id, p_type, v_signed, p_note, (select auth.uid()))
  returning id into v_tx_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_tx_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_tx_id;
end;
$$;

revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text, uuid) from public, anon;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text, uuid) to authenticated;

-- ===========================================================================
-- adjust_stock: add optional idempotency. Body otherwise unchanged from 00009
-- so the count_adjustment semantics (absolute counted quantity, delta computed
-- server-side under row lock) are preserved exactly.
-- ===========================================================================

drop function if exists public.adjust_stock(uuid, text, numeric, numeric, text, text);

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null,
  p_client_op_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_current numeric(12,3);
  v_delta numeric(12,3);
  v_new_stock numeric(12,3);
  v_movement_id uuid;
  v_claimed boolean;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance') then
    raise exception 'Type de mouvement invalide';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'Produit introuvable';
  end if;

  if not exists (
    select 1 from public.stores
    where id = v_store_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Accès refusé';
  end if;

  if p_client_op_id is not null then
    insert into public.idempotency_keys (store_id, op_key, endpoint)
    values (v_store_id, p_client_op_id, 'adjust_stock')
    on conflict (store_id, op_key) do nothing
    returning true into v_claimed;

    if v_claimed is null then
      select result into v_result
      from public.idempotency_keys
      where store_id = v_store_id and op_key = p_client_op_id;

      if v_result is null then
        raise exception 'Opération déjà traitée, résultat indisponible';
      end if;
      return (v_result #>> '{}')::uuid;
    end if;
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
    (v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note, (select auth.uid()))
  returning id into v_movement_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_movement_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid) from public, anon;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid) to authenticated;

-- ===========================================================================
-- checkout_sale: full rewrite. Signature changes twice over (unit_price removed
-- from the items, p_client_op_id added), so the 00010 overload is dropped.
-- ===========================================================================

drop function if exists public.checkout_sale(jsonb, text, uuid, numeric, text);

create or replace function public.checkout_sale(
  p_items jsonb,                      -- [{product_id, quantity}] - no price
  p_payment_mode text,                -- 'cash' | 'credit'
  p_customer_id uuid default null,
  p_amount_received numeric default null,
  p_note text default null,
  -- Trailing parameters require a default or Postgres rejects the whole function
  -- with 42P13. p_client_op_id is still mandatory in practice: the body raises if
  -- it arrives null, which is the same contract with a valid signature.
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
  -- The primary key (store_id, op_key) is what makes this safe: a repeat blocks
  -- here until the first transaction commits, then falls through to the stored
  -- result. If the first attempt raised, its key row rolled back with it and the
  -- retry runs cleanly.
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

    -- The line that made the old function exploitable.
    if v_line_store <> v_store_id then
      raise exception 'Accès refusé';
    end if;

    if v_current < v_line.quantity then
      raise exception 'Stock insuffisant pour %: % en stock, % demandé',
        v_name, v_current, v_line.quantity;
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
    -- Never verified before: any authenticated user could post a carnet
    -- transaction onto another store's customer.
    if not exists (
      select 1 from public.carnet_customers c
      where c.id = p_customer_id and c.store_id = v_store_id
    ) then
      raise exception 'Client introuvable';
    end if;
  end if;

  -- ── Apply ───────────────────────────────────────────────────────────────
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

    insert into public.stock_movements
      (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by)
    values
      (v_store_id, v_line.product_id, 'sale', -v_line.quantity, v_price, null,
       coalesce(p_note, 'Vente comptant'::text), (select auth.uid()))
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
  end loop;

  -- Delegate the credit so the balance is genuinely recomputed. No inner
  -- idempotency key: the claim above already makes this whole call replay-safe.
  if p_payment_mode = 'credit' then
    perform public.record_carnet_transaction(
      p_customer_id,
      'credit'::text,
      v_total,
      coalesce(p_note, 'Achat ' || v_count || ' produit(s)'::text),
      null
    );
  end if;

  v_result := jsonb_build_object(
    'total',       v_total,
    'change',      v_change,
    'movement_ids', to_jsonb(v_movement_ids),
    'items_count', v_count
  );

  update public.idempotency_keys
  set result = v_result
  where store_id = v_store_id and op_key = p_client_op_id;

  return v_result;
end;
$$;

revoke execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) from public, anon;
grant execute on function public.checkout_sale(jsonb, text, uuid, numeric, text, uuid) to authenticated;

notify pgrst, 'reload schema';