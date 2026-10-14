grant usage on schema public to anon, authenticated;

grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

revoke execute on function public.is_store_owner(uuid) from public, anon;
revoke execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.record_carnet_transaction(uuid, text, numeric, text) from public, anon;
revoke execute on function public.get_dashboard_stats() from public, anon;
grant execute on function public.is_store_owner(uuid) to authenticated;
grant execute on function public.adjust_stock(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_carnet_transaction(uuid, text, numeric, text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';
