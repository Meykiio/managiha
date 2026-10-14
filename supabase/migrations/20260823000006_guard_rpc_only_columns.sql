create or replace function public.guard_computed_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'products'
     and new.current_stock is distinct from old.current_stock
     and current_user = 'authenticated' then
    raise exception 'current_stock ne peut être modifié que via la fonction adjust_stock()';
  end if;

  if tg_table_name = 'carnet_customers'
     and new.balance is distinct from old.balance
     and current_user = 'authenticated' then
    raise exception 'balance ne peut être modifiée que via la fonction record_carnet_transaction()';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_guard_stock on public.products;
create trigger trg_products_guard_stock
  before update on public.products
  for each row execute function public.guard_computed_columns();

drop trigger if exists trg_carnet_guard_balance on public.carnet_customers;
create trigger trg_carnet_guard_balance
  before update on public.carnet_customers
  for each row execute function public.guard_computed_columns();
