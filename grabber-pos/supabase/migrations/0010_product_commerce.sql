-- MyPoz Commerce Cloud — Phase 2: Shopify-style product fields on canonical products table.

alter table products add column if not exists compare_at_price numeric(12,2) check (compare_at_price >= 0);
alter table products add column if not exists tags text[] not null default '{}';
alter table products add column if not exists seo_title text;
alter table products add column if not exists seo_description text;
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists online_status text not null default 'published'
  check (online_status in ('draft', 'published', 'archived'));
alter table products add column if not exists image_url text;
alter table products add column if not exists weight_grams integer check (weight_grams >= 0);

create index if not exists products_featured_idx on products (org_id, featured) where featured;
create index if not exists products_tags_idx on products using gin (tags);

-- Extend storefront catalog RPC to return commerce fields.
create or replace function storefront_catalog(
  p_host text, p_slug text, p_search text, p_category text, p_page int, p_page_size int
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sf storefronts;
  v_org uuid;
  v_branch uuid;
  v_offset int;
  v_total bigint;
  v_items jsonb;
  v_cats jsonb;
begin
  select * into v_sf from storefront_by_host(p_host, p_slug);
  if v_sf.org_id is null then return null; end if;
  v_org := v_sf.org_id;
  v_branch := coalesce(v_sf.branch_id,
    (select b.id from branches b where b.org_id = v_org and b.is_active order by b.created_at limit 1));
  v_offset := greatest((coalesce(p_page, 1) - 1) * coalesce(p_page_size, 24), 0);

  select count(*) into v_total
    from products p
   where p.org_id = v_org and p.is_active and p.online_visible
     and p.online_status = 'published'
     and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%'
          or coalesce(p.description, '') ilike '%' || p_search || '%')
     and (p_category is null or p_category = '' or p_category = 'all'
          or exists (select 1 from categories c where c.id = p.category_id and c.name = p_category));

  select coalesce(jsonb_agg(row_to_json(f)::jsonb order by f.featured desc, f.name), '[]'::jsonb) into v_items
    from (
      select p.id, p.slug, p.name, p.name_local as "nameLocal",
             p.description, p.brand,
             coalesce(p.online_price, p.sale_price) as price,
             p.compare_at_price as "compareAtPrice",
             p.image_url as "imageUrl",
             coalesce(bs.quantity, 0) as stock,
             p.featured,
             p.tags,
             (select b.barcode from product_barcodes b where b.product_id = p.id limit 1) as barcode,
             (select c.name from categories c where c.id = p.category_id) as category
        from products p
        left join branch_stock bs on bs.product_id = p.id and bs.branch_id = v_branch
       where p.org_id = v_org and p.is_active and p.online_visible
         and p.online_status = 'published'
         and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%'
              or coalesce(p.description, '') ilike '%' || p_search || '%')
         and (p_category is null or p_category = '' or p_category = 'all'
              or exists (select 1 from categories c where c.id = p.category_id and c.name = p_category))
       order by p.featured desc, p.name
       limit coalesce(p_page_size, 24) offset v_offset
    ) f;

  select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'count', c.cnt)), '[]'::jsonb) into v_cats
    from (
      select cat.name, count(*) as cnt
        from products p
        join categories cat on cat.id = p.category_id
       where p.org_id = v_org and p.is_active and p.online_visible and p.online_status = 'published'
       group by cat.name order by cat.name
    ) c;

  return jsonb_build_object('items', v_items, 'total', v_total, 'categories', v_cats);
end;
$$;

create or replace function storefront_product(p_host text, p_slug text, p_product text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'name', p.name, 'nameLocal', p.name_local,
    'description', p.description, 'brand', p.brand,
    'price', coalesce(p.online_price, p.sale_price),
    'compareAtPrice', p.compare_at_price,
    'imageUrl', p.image_url,
    'stock', coalesce(bs.quantity, 0),
    'featured', p.featured,
    'tags', p.tags,
    'seoTitle', p.seo_title,
    'seoDescription', p.seo_description,
    'barcode', (select b.barcode from product_barcodes b where b.product_id = p.id limit 1),
    'category', (select c.name from categories c where c.id = p.category_id)
  )
  from storefront_by_host(p_host, p_slug) s
  join products p on p.org_id = s.org_id and p.slug = p_product
                 and p.is_active and p.online_visible and p.online_status = 'published'
  left join branch_stock bs on bs.product_id = p.id and bs.branch_id = s.branch_id;
$$;
