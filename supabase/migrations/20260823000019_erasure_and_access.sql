-- ============================================================================
-- Migration 00019 - Phase 5: right-of-erasure path and its audit trail.
--
-- Loi 18-07 (Algerian data protection) gives a data subject a right to erasure.
-- Two constraints shape how that can be honoured here:
--
--   1. This product's own rule is "no hard-delete affordance". A shopkeeper must
--      never be one tap away from destroying a ledger, so erasure is an explicit
--      operation with a recorded reason, not a button.
--
--   2. Anonymisation, not deletion. carnet_transactions are financial records
--      with their own retention obligation, and the credit balance is a claim the
--      shop may need to evidence. Deleting the rows would destroy evidence the
--      shop is entitled - and arguably required - to keep. Clearing the personal
--      data while keeping the amounts satisfies the erasure request without
--      destroying the accounting record.
--
-- Refusing while a balance is outstanding is deliberate and is the honest legal
-- position: the shop has a legitimate claim, and the request is not refused, it
-- is deferred until the debt is settled or written off. Silently anonymising a
-- debtor would erase the shop's own evidence.
--
-- The same reasoning applies to products, suppliers and categories, with no
-- personal data in them at all - they are already covered by archived_at.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Erasure log
--
-- Demonstrating compliance requires being able to show when an erasure happened,
-- for whom, and on what basis. Without this the shop cannot answer a regulator.
-- ---------------------------------------------------------------------------

create table if not exists public.data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subject_type text not null check (subject_type in ('carnet_customer')),
  subject_id uuid not null,
  reason text,
  fields_cleared text[] not null default '{}',
  performed_by uuid references auth.users(id),
  performed_at timestamptz not null default now()
);

comment on table public.data_erasure_log is
  'Audit trail for GDPR/Loi 18-07 erasure requests. Retained because the controller must be able to evidence compliance; contains no personal data itself beyond a subject id.';

create index if not exists idx_erasure_log_store
  on public.data_erasure_log (store_id, performed_at desc);

alter table public.data_erasure_log enable row level security;

drop policy if exists "erasure_log_select" on public.data_erasure_log;

-- Readable by the store owner so they can evidence their own compliance.
-- No insert, update or delete policy: rows are written only by the
-- SECURITY DEFINER function below, so the log cannot be tampered with or forged.
create policy "erasure_log_select" on public.data_erasure_log
  for select to authenticated
  using ((select private.is_store_owner(store_id)));

-- ---------------------------------------------------------------------------
-- 2. The erasure operation
-- ---------------------------------------------------------------------------

create or replace function public.anonymize_carnet_customer(
  p_customer_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_balance numeric(12,2);
  v_log_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  select store_id, balance into v_store_id, v_balance
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

  -- A zero balance is the precondition, not a formality: see the file header.
  if v_balance <> 0 then
    raise exception
      'Impossible d''anonymiser un client dont le solde n''est pas nul (solde : %). Réglez ou annulez la créance d''abord.',
      v_balance;
  end if;

  -- Idempotent: anonymising twice is a no-op rather than an error, because a
  -- repeated request is normal when someone chases a ticket.
  if exists (
    select 1 from public.data_erasure_log
    where subject_type = 'carnet_customer'
      and subject_id = p_customer_id
  ) then
    return p_customer_id;
  end if;

  update public.carnet_customers
  set full_name    = 'Client anonymisé',
      phone        = null,
      notes        = null,
      archived_at  = coalesce(archived_at, now()),
      updated_at   = now()
  where id = p_customer_id;

  -- Transactions are deliberately untouched. The amounts remain, the person does
  -- not: carnet_transactions carries no name or phone of its own, only the
  -- customer_id, which now resolves to an anonymised row.

  insert into public.data_erasure_log
    (store_id, subject_type, subject_id, reason, fields_cleared, performed_by)
  values
    (v_store_id, 'carnet_customer', p_customer_id, p_reason,
     array['full_name', 'phone', 'notes'], (select auth.uid()))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

comment on function public.anonymize_carnet_customer(uuid, text) is
  'Loi 18-07 right of erasure. Clears personal data on a carnet customer with a zero balance and records the erasure. Refuses while a balance is outstanding.';

revoke execute on function public.anonymize_carnet_customer(uuid, text) from public, anon;
grant  execute on function public.anonymize_carnet_customer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Subject access: what do we hold about this person
--
-- The access right is the other half of erasure, and answering it by hand means
-- reading five tables. This returns everything held, in one shape, so the answer
-- is complete rather than best-effort.
-- ---------------------------------------------------------------------------

create or replace function public.export_carnet_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_store_id uuid;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
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

  select jsonb_build_object(
    'customer', to_jsonb(c) - 'store_id',
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(t) - 'store_id' order by t.created_at)
      from public.carnet_transactions t
      where t.customer_id = c.id
    ), '[]'::jsonb),
    'erasures', coalesce((
      select jsonb_agg(to_jsonb(e) - 'store_id' order by e.performed_at)
      from public.data_erasure_log e
      where e.subject_type = 'carnet_customer' and e.subject_id = c.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.carnet_customers c
  where c.id = p_customer_id;

  return v_result;
end;
$$;

comment on function public.export_carnet_customer(uuid) is
  'Loi 18-07 right of access. Returns everything held about one carnet customer as a single JSON document.';

revoke execute on function public.export_carnet_customer(uuid) from public, anon;
grant  execute on function public.export_carnet_customer(uuid) to authenticated;

notify pgrst, 'reload schema';
