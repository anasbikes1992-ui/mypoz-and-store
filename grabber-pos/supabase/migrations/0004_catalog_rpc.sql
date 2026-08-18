-- GRABBER POS Studio — read RPCs that return catalog rows in the exact shape
-- the apps consume (camelCase-friendly JSON), joining category, barcodes and
-- per-branch stock in one round trip.

-- One product row as the apps expect it.
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
    'maxDiscount', p.max_discount,
    'singleDiscount', p.single_discount,
    'quantity', coalesce(
      (select bs.quantity from branch_stock bs
        where bs.product_id = p.id and bs.branch_id = p_branch), 0),
    'category', coalesce((select c.name from categories c where c.id = p.category_id), 'Uncategorized'),
    'expireDate', (select bs.expire_date from branch_stock bs
        where bs.product_id = p.id and bs.branch_id = p_branch),
    'warrantyMonths', p.warranty_months,
    'supplier', (select s.name from suppliers s where s.id = p.supplier_id)
  );
$$;

-- Paged, filtered catalog. Returns { items, total, categories }.
create or replace function catalog(
  p_branch   uuid,
  p_search   text default null,
  p_category text default null,
  p_page     int  default 1,
  p_page_size int default 60
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_total int;
  v_items jsonb;
  v_cats jsonb;
begin
  select count(*) into v_total
    from products p
    left join categories c on c.id = p.category_id
   where p.org_id = v_org and p.is_active
     and (p_category is null or c.name = p_category)
     and (p_search is null or p.name ilike '%'||p_search||'%'
          or p.name_local ilike '%'||p_search||'%'
          or p.brand ilike '%'||p_search||'%'
          or exists (select 1 from product_barcodes b
                      where b.product_id = p.id and b.barcode ilike '%'||p_search||'%'));

  select coalesce(jsonb_agg(product_json(p, p_branch)), '[]'::jsonb) into v_items
    from (
      select p.* from products p
      left join categories c on c.id = p.category_id
      where p.org_id = v_org and p.is_active
        and (p_category is null or c.name = p_category)
        and (p_search is null or p.name ilike '%'||p_search||'%'
             or p.name_local ilike '%'||p_search||'%'
             or p.brand ilike '%'||p_search||'%'
             or exists (select 1 from product_barcodes b
                         where b.product_id = p.id and b.barcode ilike '%'||p_search||'%'))
      order by p.name
      limit p_page_size offset v_offset
    ) p;

  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
    into v_cats
    from (
      select coalesce(c.name, 'Uncategorized') as name, count(*) as cnt
        from products p
        left join categories c on c.id = p.category_id
       where p.org_id = v_org and p.is_active
       group by 1
    ) t;

  return jsonb_build_object('items', v_items, 'total', v_total, 'categories', v_cats);
end;
$$;

-- Exact barcode → product (for the scanner path).
create or replace function product_by_barcode(p_branch uuid, p_code text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_p products%rowtype;
begin
  select p.* into v_p from products p
    join product_barcodes b on b.product_id = p.id
   where p.org_id = v_org and b.barcode = p_code and p.is_active
   limit 1;
  if not found then return null; end if;
  return product_json(v_p, p_branch);
end;
$$;

-- Inventory KPIs for a branch.
create or replace function inventory_stats(p_branch uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'productCount', (select count(*) from products where org_id = current_org_id() and is_active),
    'stockValue', coalesce((
      select sum(p.cost_price * bs.quantity)
        from branch_stock bs join products p on p.id = bs.product_id
       where bs.branch_id = p_branch), 0),
    'lowStock', (
      select count(*) from branch_stock bs join products p on p.id = bs.product_id
       where bs.branch_id = p_branch and bs.quantity <= p.reorder_level),
    'expired', (
      select count(*) from branch_stock bs
       where bs.branch_id = p_branch and bs.expire_date is not null and bs.expire_date < now()::date)
  );
$$;
