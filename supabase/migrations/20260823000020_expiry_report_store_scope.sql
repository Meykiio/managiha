-- ============================================================================
-- Migration 00020 - scope expiry_report to a store.
--
-- 00016 created expiry_report without store_id, reading product_lots joined to
-- products. With security_invoker the RLS policies do restrict it to the
-- caller's rows, so it was not leaking. But the client cannot then filter by
-- store, which means the view is only usable by someone who owns exactly one —
-- and "one store per owner" is a product decision, not something the database
-- enforces. A view that silently returns the wrong shop's stock the day that
-- decision changes is worse than one that takes a filter.
--
-- So: expose store_id and let the caller say which store it means.
--
-- Also adds a covering index for the query the expiry screen actually runs:
-- open lots with a date, soonest first, within one store.
-- ============================================================================

drop view if exists public.expiry_report;

create view public.expiry_report
with (security_invoker = true)
as
select
  l.id                                  as lot_id,
  l.store_id,
  l.product_id,
  p.name                                as product_name,
  p.unit,
  l.expiry_date,
  l.quantity,
  l.lot_code,
  p.sell_price,
  p.cost_price,
  l.quantity * coalesce(p.sell_price, 0) as value_at_risk,
  (l.expiry_date - current_date)         as days_left
from public.product_lots l
join public.products p on p.id = l.product_id
where l.closed_at is null
  and l.quantity > 0
  and l.expiry_date is not null;

comment on view public.expiry_report is
  'Open lots with an expiry date, scoped by store_id. value_at_risk is what the stock would sell for if it expired unsold; cost_at_risk is what it cost.';

grant select on public.expiry_report to authenticated;

-- The expiry screen filters one store to dated open lots and sorts by urgency.
create index if not exists product_lots_store_expiry_idx
  on public.product_lots (store_id, expiry_date)
  where closed_at is null;

notify pgrst, 'reload schema';
