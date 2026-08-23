-- Launch hardening: close advisor ERROR tables; revoke POS RPCs from anon.
-- Storefront RPCs stay granted to anon (by design). POS write RPCs are
-- session/service-role only via the Next.js app.

-- Receipt counters are only touched by next_receipt_no (SECURITY DEFINER).
alter table if exists public.receipt_counters enable row level security;

-- One-off Anaz import staging — not a product table.
drop table if exists public._anaz_chunk_staging;

-- Deny anonymous direct RPC for inventory / sales mutations & reads that
-- expect an org session. Authenticated retains EXECUTE (app uses user JWT).
revoke all on function public.create_sale(jsonb) from public, anon;
revoke all on function public.adjust_stock(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.receive_purchase(uuid) from public, anon;
revoke all on function public.set_branch_stock(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.next_receipt_no(uuid) from public, anon;
revoke all on function public.catalog(uuid, text, text, integer, integer) from public, anon;
revoke all on function public.product_by_barcode(uuid, text) from public, anon;
revoke all on function public.inventory_stats(uuid) from public, anon;
revoke all on function public.get_sale(uuid) from public, anon;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_sale_fulfillment'
  ) then
    execute 'revoke all on function public.update_sale_fulfillment(uuid, public.fulfillment_status) from public, anon';
    execute 'grant execute on function public.update_sale_fulfillment(uuid, public.fulfillment_status) to authenticated';
  end if;
end $$;

grant execute on function public.create_sale(jsonb) to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.receive_purchase(uuid) to authenticated;
grant execute on function public.set_branch_stock(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.next_receipt_no(uuid) to authenticated;
grant execute on function public.catalog(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.product_by_barcode(uuid, text) to authenticated;
grant execute on function public.inventory_stats(uuid) to authenticated;
grant execute on function public.get_sale(uuid) to authenticated;
