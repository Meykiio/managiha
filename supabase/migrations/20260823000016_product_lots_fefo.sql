-- ============================================================================
-- Migration 00016 - Phase 2: product_lots and FEFO
--
-- Why: products.expiry_date is one date on one product, which cannot represent
-- three deliveries of the same product arriving on different dates with different
-- expiry dates and different quantities. A shopkeeper receiving milk on the 1st
-- and again on the 20th has two lots. Selling from them in the wrong order loses
-- money quietly, and none of the six Algerian competitors tracks it.
--
-- Design commitments:
--
--   * products.current_stock stays authoritative as the SUM of its lots' quantities.
--     Every existing report, the guard trigger and adjust_stock's invariants keep
--     working unchanged. Lot arithmetic can never take a lot negative, so the sum
--     can never disagree with the product total.
--
--   * Lots without an expiry date are still lots, with expiry_date null, and sort
--     last under FEFO. Bread and cleaning products are lots too; making the column
--     NOT NULL would push shops to invent fake dates, and fake dates poison the
--     expiry report.
--
--   * Existing products are backfilled into a single open lot, so no live data
--     migration is needed and behaviour is identical before and after.
--
--   * adjust_stock keeps p_client_op_id as its 7th parameter and appends the lot
--     parameters after it, so the existing call shape is unchanged. The 7-argument
--     overload from 00013 is dropped rather than left in place: two overloads that
--     differ only in trailing optional arguments make PostgREST's function lookup
--     ambiguous, and the client would keep resolving to the lot-unaware version.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. product_lots
-- ---------------------------------------------------------------------------

create table if not exists public.product_lots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  expiry_date date,
  -- Free-text batch reference from the supplier. Deliberately not unique: two
  -- suppliers legitimately use the same batch number.
  lot_code text,

  quantity numeric(12,3) not null default 0 check (quantity >= 0),

  unit_cost numeric(12,2),
  supplier_id uuid references public.suppliers(id),

  received_at timestamptz not null default now(),

  -- A lot is closed when its quantity reaches zero. A column rather than a derived
  -- value so "this delivery is finished" survives a later correction that reopens
  -- it, and so lot lists can hide closed lots without aggregating every quantity.
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- NULLS NOT DISTINCT (PG 15+) is load-bearing. By default NULLs are DISTINCT in
  -- a unique index, which means an unlabelled lot (lot_code IS NULL) never
  -- collides and the ON CONFLICT below inserts a duplicate row on every receipt
  -- instead of reopening the existing lot. Undated, unlabelled stock is the common
  -- case: bread, cleaning products, any delivery without a batch number, so the
  -- default would leak a new lot row per delivery.
  unique nulls not distinct (store_id, product_id, expiry_date, lot_code)
);

comment on table public.product_lots is
  'One physical delivery of a product. products.current_stock is the sum of these quantities.';

create index if not exists idx_product_lots_product
  on public.product_lots (product_id, closed_at);

create index if not exists idx_product_lots_store_open
  on public.product_lots (store_id, closed_at, expiry_date);

create index if not exists idx_product_lots_expiring
  on public.product_lots (store_id, expiry_date)
  where expiry_date is not null and closed_at is null;

-- ---------------------------------------------------------------------------
-- 2. stock_movements references the lot it moved
-- ---------------------------------------------------------------------------

alter table public.stock_movements
  add column if not exists lot_id uuid references public.product_lots(id);

create index if not exists idx_stock_movements_lot
  on public.stock_movements (lot_id)
  where lot_id is not null;

-- ---------------------------------------------------------------------------
-- 3. RLS: read-only, like products.current_stock
-- ---------------------------------------------------------------------------

alter table public.product_lots enable row level security;

drop policy if exists "product_lots_select" on public.product_lots;

create policy "product_lots_select" on public.product_lots
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

-- No insert, update or delete policy exists, deliberately. Lots change only
-- inside adjust_stock() and checkout_sale(), which is the same reason
-- products.current_stock has no write policy: the quantity and the history must
-- not be able to drift apart.

-- ---------------------------------------------------------------------------
-- 4. Guard trigger, in the private schema alongside the existing two
-- ---------------------------------------------------------------------------

create or replace function private.guard_lot_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quantity is distinct from old.quantity
     and current_user = 'authenticated' then
    raise exception 'product_lots.quantity ne peut etre modifiee que par une fonction RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_lots_guard_quantity on public.product_lots;
create trigger trg_product_lots_guard_quantity
  before update on public.product_lots
  for each row execute function private.guard_lot_quantity();

revoke execute on function private.guard_lot_quantity() from public, anon;

-- ---------------------------------------------------------------------------
-- 5. Backfill: each existing product with stock becomes one open lot
-- ---------------------------------------------------------------------------

insert into public.product_lots
  (store_id, product_id, expiry_date, lot_code, quantity, unit_cost, supplier_id, received_at)
select
  p.store_id,
  p.id,
  p.expiry_date,
  null,
  p.current_stock,
  p.cost_price,
  p.supplier_id,
  coalesce(p.created_at, now())
from public.products p
where p.current_stock <> 0
on conflict do nothing;

-- Products at zero get their first lot when something is received into them.
-- Products at zero are exactly the ones that need no backfill.

-- ---------------------------------------------------------------------------
-- 6. FEFO ordering
-- ---------------------------------------------------------------------------

-- Every open lot for a product, earliest expiry first. Returns all of them and
-- lets the caller consume greedily, rather than guessing how many rows are needed
-- with a LIMIT: a caller computing a row count from a per-row quantity would be
-- wrong the moment one lot partially covers the request.
--
-- Null expiry sorts last. Dated stock should be sold before undated stock, because
-- dated stock is the stock that expires.
create or replace function public.allocate_lots_fefo(p_product_id uuid)
returns table (
  lot_id uuid,
  lot_quantity numeric(12,3),
  expiry_date date,
  lot_code text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id
      and (select private.is_store_owner(p.store_id))
  ) then
    raise exception 'Accès refusé';
  end if;

  return query
  select l.id, l.quantity, l.expiry_date, l.lot_code
  from public.product_lots l
  where l.product_id = p_product_id
    and l.closed_at is null
    and l.quantity > 0
  order by
    (l.expiry_date is null),
    l.expiry_date asc nulls last,
    l.received_at asc,
    l.id;
end;
$$;

revoke execute on function public.allocate_lots_fefo(uuid) from public, anon;
grant  execute on function public.allocate_lots_fefo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. adjust_stock: idempotency preserved, lots added
-- ---------------------------------------------------------------------------

-- The 7-argument version from 00013 is dropped first. Keeping it would leave two
-- overloads and make every call ambiguous.
drop function if exists public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid);

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reason text default null,
  p_note text default null,
  p_client_op_id uuid default null,
  p_lot_id uuid default null,
  p_expiry_date date default null,
  p_lot_code text default null
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
  v_lot_id uuid;
  v_lot record;
  v_take numeric(12,3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if p_movement_type not in ('receive','sale','return','opening_balance','damage','theft','count_adjustment','correction') then
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

  -- Product lock first: concurrent receipts and sales serialise here rather than
  -- racing on the lot rows.
  select current_stock into v_current
  from public.products
  where id = p_product_id
  for update;

  -- Semantics unchanged from 00009 and 00013, including count_adjustment being an
  -- absolute counted quantity with the delta computed here under the lock.
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

  -- ── Resolve the lot ─────────────────────────────────────────────────────
  if p_lot_id is not null then
    if not exists (
      select 1 from public.product_lots
      where id = p_lot_id and product_id = p_product_id and store_id = v_store_id
    ) then
      raise exception 'Lot invalide pour ce produit';
    end if;
    v_lot_id := p_lot_id;

  elsif v_delta > 0 then
    -- Incoming stock. The delivery is identified by expiry date plus lot code.
    -- Defaulting to products.expiry_date keeps every pre-lot call site correct.
    insert into public.product_lots
      (store_id, product_id, expiry_date, lot_code, quantity, unit_cost, supplier_id)
    values (
      v_store_id,
      p_product_id,
      coalesce(p_expiry_date, (select p2.expiry_date from public.products p2 where p2.id = p_product_id)),
      nullif(p_lot_code, ''),
      0,
      coalesce(p_unit_cost, (select p3.cost_price from public.products p3 where p3.id = p_product_id)),
      (select p4.supplier_id from public.products p4 where p4.id = p_product_id)
    )
    -- Reopening rather than duplicating: receiving more of a batch already sold
    -- through should extend that lot, not create a second row for it.
    on conflict (store_id, product_id, expiry_date, lot_code)
      do update set closed_at = null, updated_at = now()
    returning id into v_lot_id;

  else
    -- Outgoing stock with no explicit lot: take from the earliest-expiry lot that
    -- has stock. Single-lot consumption; checkout_sale is the path that splits a
    -- sale across several lots.
    select a.lot_id into v_lot_id
    from public.allocate_lots_fefo(p_product_id) a
    where a.lot_quantity + v_delta >= 0
    limit 1;

    if v_lot_id is null then
      raise exception 'Stock insuffisant dans les lots de ce produit';
    end if;
  end if;

  -- Apply to the lot. The quantity >= 0 check inside the UPDATE is what keeps the
  -- lot sum equal to products.current_stock; if it fails, the row is not updated
  -- and the exception below aborts the whole transaction.
  if v_lot_id is not null then
    update public.product_lots
    set quantity  = quantity + v_delta,
        closed_at = case when quantity + v_delta <= 0 then now() else null end,
        updated_at = now()
    where id = v_lot_id
      and quantity + v_delta >= 0;

    if not found then
      raise exception 'Stock insuffisant dans le lot sélectionné';
    end if;
  end if;

  update public.products
  set current_stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements
    (store_id, product_id, movement_type, quantity, unit_cost, reason, note, created_by, lot_id)
  values (
    v_store_id, p_product_id, p_movement_type, v_delta, p_unit_cost, p_reason, p_note,
    (select auth.uid()), v_lot_id
  )
  returning id into v_movement_id;

  if p_client_op_id is not null then
    update public.idempotency_keys
    set result = to_jsonb(v_movement_id)
    where store_id = v_store_id and op_key = p_client_op_id;
  end if;

  return v_movement_id;
end;
$$;

revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid, uuid, date, text) from public, anon;
grant  execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text, uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. checkout_sale: consume lots FEFO, one movement per lot
-- ---------------------------------------------------------------------------

drop function if exists public.checkout_sale(jsonb, text, uuid, numeric, text, uuid);

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
        coalesce(p_note, 'Vente comptant'::text), (select auth.uid()), v_lot.lot_id
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
      coalesce(p_note, 'Achat ' || v_count || ' produit(s)'::text),
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

-- ---------------------------------------------------------------------------
-- 9. Expiry reporting reads lots, and shows money at risk
-- ---------------------------------------------------------------------------

drop view if exists public.expiry_report;

create view public.expiry_report
with (security_invoker = true)
as
select
  l.id              as lot_id,
  l.product_id,
  p.name            as product_name,
  p.unit,
  l.expiry_date,
  l.quantity,
  l.lot_code,
  p.sell_price,
  l.quantity * coalesce(p.sell_price, 0) as value_at_risk,
  (l.expiry_date - current_date)        as days_left
from public.product_lots l
join public.products p on p.id = l.product_id
where l.closed_at is null
  and l.quantity > 0
  and l.expiry_date is not null;

comment on view public.expiry_report is
  'Open lots with an expiry date. value_at_risk is what the stock would sell for if it expired unsold.';

notify pgrst, 'reload schema';