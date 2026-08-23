-- Wave 1 wholesale: VIP tier price + MOQ on products.
alter table products
  add column if not exists vip_price numeric(12,2) check (vip_price is null or vip_price >= 0),
  add column if not exists min_wholesale_qty integer not null default 0 check (min_wholesale_qty >= 0);

create or replace function product_json(p products, p_branch uuid)
returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'nameLocal', p.name_local,
    'barcodes', coalesce(
      (select jsonb_agg(b.barcode) from product_barcodes b where b.product_id = p.id),
      '[]'::jsonb),
    'brand', p.brand,
    'stockDate', null,
    'costPrice', p.cost_price,
    'salePrice', p.sale_price,
    'wholesalePrice', p.wholesale_price,
    'vipPrice', p.vip_price,
    'minWholesaleQty', coalesce(p.min_wholesale_qty, 0),
    'maxDiscount', p.max_discount,
    'singleDiscount', p.single_discount,
    'quantity', coalesce(
      (select bs.quantity from branch_stock bs
        where bs.product_id = p.id and bs.branch_id = p_branch), 0),
    'category', coalesce((select c.name from categories c where c.id = p.category_id), 'Uncategorized'),
    'expireDate', (select bs.expire_date from branch_stock bs
        where bs.product_id = p.id and bs.branch_id = p_branch),
    'warrantyMonths', p.warranty_months,
    'supplier', (select s.name from suppliers s where s.id = p.supplier_id),
    'imageUrl', p.image_url
  );
$$;
