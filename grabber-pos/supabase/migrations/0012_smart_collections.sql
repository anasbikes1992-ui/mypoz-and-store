-- MyPoz Commerce Cloud — Phase 4: smart collections engine.

alter table store_collections add column if not exists collection_type text not null default 'manual'
  check (collection_type in ('manual', 'automated'));

alter table store_collections add column if not exists rules jsonb not null default '[]'::jsonb;

alter table store_collections add column if not exists sort_order text not null default 'manual'
  check (sort_order in ('manual', 'best_selling', 'price_asc', 'price_desc', 'newest'));

alter table store_collections add column if not exists image_url text;
alter table store_collections add column if not exists seo_title text;
alter table store_collections add column if not exists seo_description text;
alter table store_collections add column if not exists visible boolean not null default true;

-- Junction for manual collection membership.
create table if not exists store_collection_products (
  collection_id uuid not null references store_collections(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  position      integer not null default 0,
  primary key (collection_id, product_id)
);

alter table store_collection_products enable row level security;

drop policy if exists store_collection_products_rw on store_collection_products;
create policy store_collection_products_rw on store_collection_products
  for all using (
    exists (select 1 from store_collections c where c.id = collection_id and c.org_id = current_org_id())
  ) with check (
    exists (select 1 from store_collections c where c.id = collection_id and c.org_id = current_org_id())
  );

-- Evaluate automated collection rules server-side for public storefront.
-- Rule format: [{"field":"price","op":"lt","value":"5000"},{"field":"tag","op":"eq","value":"new"}]
create or replace function storefront_collection_products(
  p_host text, p_slug text, p_collection text, p_page int, p_page_size int
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sf storefronts;
  v_col store_collections;
  v_branch uuid;
  v_offset int;
  v_items jsonb;
  v_total bigint;
begin
  select * into v_sf from storefront_by_host(p_host, p_slug);
  if v_sf.org_id is null then return null; end if;

  select * into v_col from store_collections
   where org_id = v_sf.org_id and slug = p_collection and visible;
  if not found then return null; end if;

  v_branch := coalesce(v_sf.branch_id,
    (select b.id from branches b where b.org_id = v_sf.org_id and b.is_active order by b.created_at limit 1));
  v_offset := greatest((coalesce(p_page, 1) - 1) * coalesce(p_page_size, 24), 0);

  if v_col.collection_type = 'manual' then
    select count(*) into v_total
      from store_collection_products cp
      join products p on p.id = cp.product_id
     where cp.collection_id = v_col.id and p.is_active and p.online_visible;

    select coalesce(jsonb_agg(row_to_json(f)::jsonb order by f.position), '[]'::jsonb) into v_items
      from (
        select p.id, p.slug, p.name, p.description, p.brand,
               coalesce(p.online_price, p.sale_price) as price,
               p.compare_at_price as "compareAtPrice",
               p.image_url as "imageUrl",
               coalesce(bs.quantity, 0) as stock,
               cp.position
          from store_collection_products cp
          join products p on p.id = cp.product_id
          left join branch_stock bs on bs.product_id = p.id and bs.branch_id = v_branch
         where cp.collection_id = v_col.id and p.is_active and p.online_visible
         order by cp.position
         limit coalesce(p_page_size, 24) offset v_offset
      ) f;
  else
    -- Automated: apply rules from JSON (price, category, tag, in_stock).
    select count(*) into v_total
      from products p
     where p.org_id = v_sf.org_id and p.is_active and p.online_visible
       and collection_matches_rules(p, v_col.rules, v_col.source_category);

    select coalesce(jsonb_agg(row_to_json(f)::jsonb), '[]'::jsonb) into v_items
      from (
        select p.id, p.slug, p.name, p.description, p.brand,
               coalesce(p.online_price, p.sale_price) as price,
               p.compare_at_price as "compareAtPrice",
               p.image_url as "imageUrl",
               coalesce(bs.quantity, 0) as stock
          from products p
          left join branch_stock bs on bs.product_id = p.id and bs.branch_id = v_branch
         where p.org_id = v_sf.org_id and p.is_active and p.online_visible
           and collection_matches_rules(p, v_col.rules, v_col.source_category)
         order by p.featured desc, p.name
         limit coalesce(p_page_size, 24) offset v_offset
      ) f;
  end if;

  return jsonb_build_object(
    'collection', jsonb_build_object(
      'title', v_col.title, 'slug', v_col.slug,
      'description', v_col.description, 'type', v_col.collection_type
    ),
    'items', v_items,
    'total', v_total
  );
end;
$$;

-- Helper: evaluate collection rules against a product row.
create or replace function collection_matches_rules(
  p products, rules jsonb, source_category text
) returns boolean
language plpgsql immutable as $$
declare
  r jsonb;
  v_field text;
  v_op text;
  v_val text;
  v_price numeric;
  v_cat text;
begin
  if source_category is not null and source_category <> '' and source_category <> 'all' then
    select c.name into v_cat from categories c where c.id = p.category_id;
    if v_cat is distinct from source_category then return false; end if;
  end if;

  if rules is null or jsonb_array_length(rules) = 0 then return true; end if;

  for r in select * from jsonb_array_elements(rules) loop
    v_field := r->>'field';
    v_op    := r->>'op';
    v_val   := r->>'value';
    v_price := coalesce(p.online_price, p.sale_price);

    if v_field = 'price' then
      if v_op = 'lt' and not (v_price < v_val::numeric) then return false; end if;
      if v_op = 'lte' and not (v_price <= v_val::numeric) then return false; end if;
      if v_op = 'gt' and not (v_price > v_val::numeric) then return false; end if;
      if v_op = 'gte' and not (v_price >= v_val::numeric) then return false; end if;
    elsif v_field = 'tag' then
      if v_op = 'eq' and not (v_val = any(p.tags)) then return false; end if;
    elsif v_field = 'featured' then
      if v_op = 'eq' and not (p.featured = (v_val::boolean)) then return false; end if;
    elsif v_field = 'category' then
      select c.name into v_cat from categories c where c.id = p.category_id;
      if v_op = 'eq' and v_cat is distinct from v_val then return false; end if;
    end if;
  end loop;

  return true;
end;
$$;

grant execute on function storefront_collection_products(text, text, text, int, int) to anon, authenticated;
