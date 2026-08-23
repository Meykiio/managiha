insert into public.profiles (id, full_name)
select u.id, nullif(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.stores (owner_id, name, currency, language, timezone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'store_name', ''), 'Mon magasin'),
  'DZD',
  'fr',
  'Africa/Algiers'
from auth.users u
where not exists (select 1 from public.stores s where s.owner_id = u.id);
