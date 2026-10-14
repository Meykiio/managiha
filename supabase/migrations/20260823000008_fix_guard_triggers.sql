drop trigger if exists trg_products_guard_stock on public.products;
drop trigger if exists trg_carnet_guard_balance on public.carnet_customers;

drop function if exists public.guard_computed_columns();

create or replace function public.guard_stock_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_stock is distinct from old.current_stock
     and current_user = 'authenticated' then
    raise exception 'current_stock ne peut être modifié que via la fonction adjust_stock()';
  end if;
  return new;
end;
$$;

create or replace function public.guard_balance_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.balance is distinct from old.balance
     and current_user = 'authenticated' then
    raise exception 'balance ne peut être modifiée que via la fonction record_carnet_transaction()';
  end if;
  return new;
end;
$$;

create trigger trg_products_guard_stock
  before update on public.products
  for each row execute function public.guard_stock_column();

create trigger trg_carnet_guard_balance
  before update on public.carnet_customers
  for each row execute function public.guard_balance_column();

revoke execute on function public.guard_stock_column() from public, anon;
revoke execute on function public.guard_balance_column() from public, anon;
