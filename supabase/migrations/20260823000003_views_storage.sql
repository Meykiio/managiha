create or replace view public.products_overview
with (security_invoker = true) as
select
  p.*,
  case
    when p.current_stock <= 0 then 'out'
    when p.low_stock_threshold is not null and p.current_stock <= p.low_stock_threshold then 'low'
    else 'healthy'
  end as stock_status
from public.products p;

grant select on public.products_overview to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

create policy "product_images_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );
