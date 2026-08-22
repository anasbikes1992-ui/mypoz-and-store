-- Wrap current_org_id() / current_user_role() as (select …)
drop policy if exists org_self on organizations;
create policy org_self on organizations
  for select using (id = (select current_org_id()));

drop policy if exists branch_read on branches;
create policy branch_read on branches
  for select using (org_id = (select current_org_id()));

drop policy if exists branch_write on branches;
create policy branch_write on branches
  for all using (org_id = (select current_org_id()) and (select current_user_role()) in ('owner','manager'))
  with check (org_id = (select current_org_id()));

drop policy if exists profile_read on profiles;
create policy profile_read on profiles
  for select using (org_id = (select current_org_id()));

drop policy if exists profile_write on profiles;
create policy profile_write on profiles
  for all using (org_id = (select current_org_id()) and (select current_user_role()) = 'owner')
  with check (org_id = (select current_org_id()));

drop policy if exists branch_members_read on branch_members;
create policy branch_members_read on branch_members
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = (select current_org_id())));

drop policy if exists suppliers_rw on suppliers;
create policy suppliers_rw on suppliers
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists categories_rw on categories;
create policy categories_rw on categories
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists products_read on products;
create policy products_read on products
  for select using (org_id = (select current_org_id()));

drop policy if exists products_write on products;
create policy products_write on products
  for all using (org_id = (select current_org_id()) and (select current_user_role()) in ('owner','manager'))
  with check (org_id = (select current_org_id()));

drop policy if exists barcodes_rw on product_barcodes;
create policy barcodes_rw on product_barcodes
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists branch_stock_read on branch_stock;
create policy branch_stock_read on branch_stock
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = (select current_org_id())));

drop policy if exists movements_read on stock_movements;
create policy movements_read on stock_movements
  for select using (org_id = (select current_org_id()));

drop policy if exists purchases_rw on purchases;
create policy purchases_rw on purchases
  for all using (org_id = (select current_org_id()) and (select current_user_role()) in ('owner','manager'))
  with check (org_id = (select current_org_id()));

drop policy if exists purchase_lines_rw on purchase_lines;
create policy purchase_lines_rw on purchase_lines
  for all using (exists (
    select 1 from purchases p where p.id = purchase_id and p.org_id = (select current_org_id())))
  with check (exists (
    select 1 from purchases p where p.id = purchase_id and p.org_id = (select current_org_id())));

drop policy if exists registers_read on registers;
create policy registers_read on registers
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = (select current_org_id())));

drop policy if exists shifts_rw on shifts;
create policy shifts_rw on shifts
  for all using (exists (
    select 1 from registers r join branches b on b.id = r.branch_id
     where r.id = register_id and b.org_id = (select current_org_id())))
  with check (exists (
    select 1 from registers r join branches b on b.id = r.branch_id
     where r.id = register_id and b.org_id = (select current_org_id())));

drop policy if exists sales_read on sales;
create policy sales_read on sales
  for select using (org_id = (select current_org_id()));

drop policy if exists sale_lines_read on sale_lines;
create policy sale_lines_read on sale_lines
  for select using (exists (
    select 1 from sales s where s.id = sale_id and s.org_id = (select current_org_id())));

drop policy if exists payments_read on payments;
create policy payments_read on payments
  for select using (exists (
    select 1 from sales s where s.id = sale_id and s.org_id = (select current_org_id())));

drop policy if exists audit_read on audit_events;
create policy audit_read on audit_events
  for select using (org_id = (select current_org_id()));

drop policy if exists app_collections_rw on app_collections;
create policy app_collections_rw on app_collections
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists stock_documents_rw on stock_documents;
create policy stock_documents_rw on stock_documents
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

do $policy$
begin
  if to_regclass('public.app_settings') is not null then
    execute 'drop policy if exists app_settings_rw on app_settings';
    execute $p$
      create policy app_settings_rw on app_settings
        for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()))
    $p$;
  end if;
  if to_regclass('public.restaurant_orders') is not null then
    execute 'drop policy if exists restaurant_orders_rw on restaurant_orders';
    execute $p$
      create policy restaurant_orders_rw on restaurant_orders
        for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()))
    $p$;
  end if;
end;
$policy$;

drop policy if exists app_documents_rw on app_documents;
create policy app_documents_rw on app_documents
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists storefronts_rw on storefronts;
create policy storefronts_rw on storefronts
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists store_collections_rw on store_collections;
create policy store_collections_rw on store_collections
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists product_variants_rw on product_variants;
create policy product_variants_rw on product_variants
  for all using (org_id = (select current_org_id())) with check (org_id = (select current_org_id()));

drop policy if exists variant_branch_stock_rw on variant_branch_stock;
create policy variant_branch_stock_rw on variant_branch_stock
  for all using (
    exists (select 1 from branches b where b.id = branch_id and b.org_id = (select current_org_id()))
  ) with check (
    exists (select 1 from branches b where b.id = branch_id and b.org_id = (select current_org_id()))
  );

drop policy if exists store_collection_products_rw on store_collection_products;
create policy store_collection_products_rw on store_collection_products
  for all using (
    exists (select 1 from store_collections c where c.id = collection_id and c.org_id = (select current_org_id()))
  ) with check (
    exists (select 1 from store_collections c where c.id = collection_id and c.org_id = (select current_org_id()))
  );

drop policy if exists media_insert_org on storage.objects;
create policy media_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select current_org_id())::text
  );

drop policy if exists media_update_org on storage.objects;
create policy media_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select current_org_id())::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select current_org_id())::text
  );

drop policy if exists media_delete_org on storage.objects;
create policy media_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select current_org_id())::text
  );