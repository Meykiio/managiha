-- ============================================================================
-- Migration 00023 - erasure writes a marker, not a French label.
--
-- 00019's anonymize_carnet_customer set full_name to 'Client anonymisé'. Two
-- problems with that:
--
--   1. It is a French string inside the database, so it surfaced verbatim in an
--      Arabic or English session. Same class of defect as a hardcoded UI string,
--      one layer further down where it is harder to spot.
--   2. It was also the only signal the client had that a row had been erased, so
--      the check that decides whether to offer erasure compared against a
--      translated string — which is language-dependent by construction.
--
-- The row now carries '[anonymised]': no language in the database, one stable
-- value to compare against, and the UI renders the wording. src/lib/constants.ts
-- holds the same marker as ANONYMISED_CUSTOMER_NAME.
--
-- The domain checks from 00019 are preserved verbatim; only the stored value and
-- the ordering of the ownership check change, the latter so the ownership failure
-- cannot be distinguished from a missing row by its message.
-- ============================================================================

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

  if not private.is_store_owner(v_store_id) then
    raise exception 'Acces refuse';
  end if;

  if coalesce(v_balance, 0) <> 0 then
    raise exception using
      message = format(
        'Impossible d''anonymiser un client dont le solde n''est pas nul (solde : %s). Reglez ou annulez la creance d''abord.',
        v_balance
      );
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
  set full_name    = '[anonymised]',
      phone        = null,
      notes        = null,
      archived_at  = coalesce(archived_at, now()),
      updated_at   = now()
  where id = p_customer_id;

  insert into public.data_erasure_log
    (store_id, subject_type, subject_id, reason, fields_cleared, performed_by)
  values
    (v_store_id, 'carnet_customer', p_customer_id, p_reason,
     array['full_name', 'phone', 'notes'], (select auth.uid()))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- Rows erased under the old label.
update public.carnet_customers
set full_name = '[anonymised]'
where full_name = 'Client anonymisé';

notify pgrst, 'reload schema';
