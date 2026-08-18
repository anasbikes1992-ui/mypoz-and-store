-- GRABBER POS Studio — public storefront (per-client e-commerce website).
--
-- Every client organization gets a public catalog on its own domain. Anonymous
-- shoppers have no profile, so current_org_id() resolves to null and RLS returns
-- them nothing — correct, but it means the storefront cannot read through the
-- normal path. Public access therefore goes through SECURITY DEFINER functions
-- that resolve the organization from the storefront itself, never from the
-- caller. That also keeps the service-role key off public pages.

-- ---------------------------------------------------------------------------
-- 1. Products gain the fields an online catalog needs.
-- ---------------------------------------------------------------------------
alter table products add column if not exists slug           text;
alter table products add column if not exists description    text;
alter table products add column if not exists online_visible boolean not null default false;
alter table products add column if not exists online_price   numeric(12,2) check (online_price >= 0);

-- Backfill a URL-safe slug from the name, de-duplicated within the organization.
with slugged as (
  select
    id,
    org_id,
    nullif(regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'), '') as base
  from products
  where slug is null
),
numbered as (
  select
    id,
    coalesce(base, 'product') as base,
    row_number() over (partition by org_id, base order by id) as n
  from slugged
)
update products p
   set slug = case when nu.n = 1 then trim(both '-' from nu.base)
                   else trim(both '-' from nu.base) || '-' || nu.n end
  from numbered nu
 where p.id = nu.id;

alter table products alter column slug set not null;
create unique index if not exists products_org_slug_idx on products (org_id, slug);
create index if not exists products_online_idx on products (org_id, online_visible) where online_visible;

-- ---------------------------------------------------------------------------
-- 2. One storefront per organization, addressed by custom domain or slug.
-- ---------------------------------------------------------------------------
create table if not exists storefronts (
  org_id          uuid primary key default current_org_id() references organizations(id) on delete cascade,
  branch_id       uuid references branches(id) on delete set null,
  slug            text not null unique,
  domain          text unique,
  enabled         boolean not null default true,
  hero_headline   text,
  hero_subline    text,
  hero_image_url  text,
  about           text,
  whatsapp_number text,
  ga4_id          text,
  google_ads_id   text,
  meta_pixel_id   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table storefronts enable row level security;

create policy storefronts_rw on storefronts
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create trigger storefronts_touch
  before update on storefronts
  for each row execute function set_updated_at();

-- Keep the already-published /store/main-store URL working for the seeded org.
insert into storefronts (org_id, branch_id, slug, enabled, hero_headline)
select o.id,
       (select b.id from branches b where b.org_id = o.id and b.is_active
         order by b.created_at limit 1),
       'main-store',
       true,
       o.name
  from organizations o
 order by o.created_at
 limit 1
on conflict (org_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Split create_sale so a trusted caller can post for an explicit org.
--
-- The body is unchanged apart from taking the organization and actor as
-- arguments instead of reading them from auth.uid(). It is revoked from every
-- client role, so only other definer functions can reach it.
-- ---------------------------------------------------------------------------
create or replace function create_sale_internal(p_org uuid, p_actor uuid, payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org          uuid := p_org;
  v_branch       uuid := (payload->>'branch_id')::uuid;
  v_client_uuid  uuid := nullif(payload->>'client_uuid', '')::uuid;
  v_method       payment_method := (payload->>'payment_method')::payment_method;
  v_cash         numeric := nullif(payload->>'cash_received', '')::numeric;
  v_sale_id      uuid;
  v_receipt      text;
  v_line         jsonb;
  v_product      products%rowtype;
  v_qty          numeric;
  v_discount     numeric;
  v_unit         numeric;
  v_line_total   numeric;
  v_subtotal     numeric := 0;
  v_discount_tot numeric := 0;
  v_total        numeric := 0;
  v_stock        numeric;
  v_existing     uuid;
  v_wholesale    boolean := coalesce((payload->>'is_wholesale')::boolean, false)
                            or v_method = 'wholesale';
  v_service      numeric := greatest(coalesce((payload->>'service_charge')::numeric, 0), 0);
  v_final_disc   numeric := greatest(coalesce((payload->>'final_discount')::numeric, 0), 0);
begin
  if v_org is null then
    raise exception 'AUTH: no organization for caller';
  end if;

  if not exists (select 1 from branches where id = v_branch and org_id = v_org) then
    raise exception 'BRANCH: % not in caller org', v_branch;
  end if;

  if v_client_uuid is not null then
    select id into v_existing
      from sales where org_id = v_org and client_uuid = v_client_uuid;
    if v_existing is not null then
      return get_sale(v_existing);
    end if;
  end if;

  for v_line in select * from jsonb_array_elements(payload->'lines') loop
    select * into v_product
      from products
     where id = (v_line->>'product_id')::uuid and org_id = v_org and is_active;
    if not found then
      raise exception 'PRODUCT: % not found', v_line->>'product_id';
    end if;

    v_qty := (v_line->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'QTY: invalid quantity for %', v_product.name;
    end if;

    v_discount := coalesce((v_line->>'discount')::numeric, 0);
    if v_discount < 0 or v_discount > v_product.max_discount then
      raise exception 'DISCOUNT: % exceeds max % for %',
        v_discount, v_product.max_discount, v_product.name;
    end if;

    v_unit := case
      when v_wholesale and v_product.wholesale_price is not null
        then v_product.wholesale_price
      else v_product.sale_price
    end;

    select quantity into v_stock
      from branch_stock where branch_id = v_branch and product_id = v_product.id;
    v_stock := coalesce(v_stock, 0);
    if v_stock < v_qty then
      raise exception 'STOCK: only % of % available', v_stock, v_product.name;
    end if;

    v_line_total := (v_unit - v_discount) * v_qty;
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_discount_tot := v_discount_tot + v_discount * v_qty;
    v_total := v_total + v_line_total;
  end loop;

  if v_total = 0 then
    raise exception 'SALE: empty sale';
  end if;

  v_final_disc := least(v_final_disc, v_total);
  v_total := v_total - v_final_disc + v_service;

  if v_method = 'cash' and coalesce(v_cash, 0) < v_total then
    raise exception 'CASH: received % less than total %', v_cash, v_total;
  end if;

  v_receipt := next_receipt_no(v_branch);

  insert into sales (
    org_id, branch_id, register_id, shift_id, receipt_no,
    subtotal, discount_total, final_discount, service_charge, total,
    payment_method, is_wholesale, customer_name, customer_mobile, employee,
    cash_received, change_due, client_uuid, created_by
  ) values (
    v_org, v_branch,
    nullif(payload->>'register_id','')::uuid,
    nullif(payload->>'shift_id','')::uuid,
    v_receipt, v_subtotal, v_discount_tot, v_final_disc, v_service, v_total,
    v_method, v_wholesale,
    nullif(payload->>'customer_name',''),
    nullif(payload->>'customer_mobile',''),
    nullif(payload->>'employee',''),
    v_cash, case when v_method = 'cash' then v_cash - v_total else null end,
    v_client_uuid, p_actor
  ) returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(payload->'lines') loop
    select * into v_product from products where id = (v_line->>'product_id')::uuid;
    v_qty := (v_line->>'quantity')::numeric;
    v_discount := coalesce((v_line->>'discount')::numeric, 0);
    v_unit := case
      when v_wholesale and v_product.wholesale_price is not null
        then v_product.wholesale_price
      else v_product.sale_price end;

    insert into sale_lines (sale_id, product_id, name, unit_price, quantity, discount, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_unit, v_qty, v_discount,
            (v_unit - v_discount) * v_qty);

    update branch_stock
       set quantity = quantity - v_qty, updated_at = now()
     where branch_id = v_branch and product_id = v_product.id
     returning quantity into v_stock;

    insert into stock_movements
      (org_id, branch_id, product_id, delta, balance_after, reason, reference_id, created_by)
    values (v_org, v_branch, v_product.id, -v_qty, v_stock, 'sale', v_sale_id, p_actor);
  end loop;

  if payload ? 'payments' and jsonb_array_length(payload->'payments') > 0 then
    insert into payments (sale_id, method, amount, reference)
    select v_sale_id, (p->>'method')::payment_method, (p->>'amount')::numeric, p->>'reference'
      from jsonb_array_elements(payload->'payments') p;
  else
    insert into payments (sale_id, method, amount)
    values (v_sale_id, v_method, v_total);
  end if;

  insert into audit_events (org_id, actor_id, action, entity, entity_id, metadata)
  values (v_org, p_actor, 'sale.created', 'sale', v_sale_id::text,
          jsonb_build_object('total', v_total, 'receipt_no', v_receipt));

  return get_sale(v_sale_id);
end;
$$;

-- Only definer functions may call it directly.
revoke all on function create_sale_internal(uuid, uuid, jsonb) from public, anon, authenticated;

-- The staff-facing entry point keeps its original signature and behaviour.
create or replace function create_sale(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return create_sale_internal(current_org_id(), auth.uid(), payload);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Public storefront reads. Org comes from the storefront, never the caller.
-- ---------------------------------------------------------------------------
create or replace function storefront_by_host(p_host text, p_slug text)
returns storefronts
language sql stable security definer set search_path = public as $$
  select * from storefronts
   where enabled
     and (domain = lower(nullif(p_host, '')) or slug = nullif(p_slug, ''))
   order by (domain = lower(nullif(p_host, ''))) desc
   limit 1;
$$;

/** Public shop profile — safe subset, no internal ids beyond the org. */
create or replace function storefront_info(p_host text, p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when s.org_id is null then null else jsonb_build_object(
    'slug',           s.slug,
    'domain',         s.domain,
    'businessName',   o.name,
    'heroHeadline',   s.hero_headline,
    'heroSubline',    s.hero_subline,
    'heroImageUrl',   s.hero_image_url,
    'about',          s.about,
    'whatsappNumber', s.whatsapp_number,
    'ga4Id',          s.ga4_id,
    'googleAdsId',    s.google_ads_id,
    'metaPixelId',    s.meta_pixel_id
  ) end
  from storefront_by_host(p_host, p_slug) s
  left join organizations o on o.id = s.org_id;
$$;

/** Paged public catalog — only products explicitly published online. */
create or replace function storefront_catalog(
  p_host     text,
  p_slug     text,
  p_search   text default null,
  p_category text default null,
  p_page     int  default 1,
  p_size     int  default 24
) returns jsonb
language sql stable security definer set search_path = public as $$
  with sf as (select * from storefront_by_host(p_host, p_slug)),
  base as (
    select p.*, coalesce(p.online_price, p.sale_price) as price,
           coalesce(bs.quantity, 0) as stock
      from products p
      join sf on sf.org_id = p.org_id
      left join branch_stock bs
        on bs.product_id = p.id and bs.branch_id = sf.branch_id
     where p.is_active and p.online_visible
  ),
  filtered as (
    select * from base
     where (p_search is null or p_search = ''
            or name ilike '%' || p_search || '%'
            or coalesce(description, '') ilike '%' || p_search || '%')
       and (p_category is null or p_category = ''
            or category_id = (select id from categories
                               where name = p_category
                                 and org_id = (select org_id from sf) limit 1))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'page',  greatest(p_page, 1),
    'size',  least(greatest(p_size, 1), 100),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'slug', f.slug, 'name', f.name, 'nameLocal', f.name_local,
        'description', f.description, 'brand', f.brand, 'price', f.price,
        'imageUrl', f.image_url, 'stock', f.stock,
        'category', (select c.name from categories c where c.id = f.category_id)
      ) order by f.name)
      from (select * from filtered order by name
             limit least(greatest(p_size, 1), 100)
            offset (greatest(p_page, 1) - 1) * least(greatest(p_size, 1), 100)) f
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'count', x.n) order by x.n desc)
        from (select category_id, count(*) n from base group by category_id) x
        join categories c on c.id = x.category_id
    ), '[]'::jsonb)
  )
  from sf;
$$;

/** A single published product, for its own indexable page. */
create or replace function storefront_product(p_host text, p_slug text, p_product text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'name', p.name, 'nameLocal', p.name_local,
    'description', p.description, 'brand', p.brand,
    'price', coalesce(p.online_price, p.sale_price),
    'imageUrl', p.image_url,
    'stock', coalesce(bs.quantity, 0),
    'barcode', (select b.barcode from product_barcodes b where b.product_id = p.id limit 1),
    'category', (select c.name from categories c where c.id = p.category_id)
  )
  from storefront_by_host(p_host, p_slug) s
  join products p on p.org_id = s.org_id and p.slug = p_product
                 and p.is_active and p.online_visible
  left join branch_stock bs on bs.product_id = p.id and bs.branch_id = s.branch_id;
$$;

/** Every published product slug — drives the per-host sitemap and ad feeds. */
create or replace function storefront_product_slugs(p_host text, p_slug text)
returns table (slug text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.slug, p.updated_at
    from storefront_by_host(p_host, p_slug) s
    join products p on p.org_id = s.org_id
   where p.is_active and p.online_visible
   order by p.name;
$$;

-- ---------------------------------------------------------------------------
-- 5. Public order placement (cash on delivery).
--
-- Prices, stock and totals are resolved server-side by create_sale_internal.
-- Anything a shopper could tamper with — price, discount, wholesale pricing,
-- service charge — is discarded here before the payload is handed on.
-- ---------------------------------------------------------------------------
create or replace function storefront_create_order(
  p_host    text,
  p_slug    text,
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sf     storefronts;
  v_branch uuid;
  v_lines  jsonb;
  v_total  numeric := 0;
  v_line   jsonb;
  v_prod   products%rowtype;
begin
  select * into v_sf from storefront_by_host(p_host, p_slug);
  if v_sf.org_id is null then
    raise exception 'STOREFRONT: not found';
  end if;

  v_branch := coalesce(
    v_sf.branch_id,
    (select b.id from branches b
      where b.org_id = v_sf.org_id and b.is_active
      order by b.created_at limit 1)
  );
  if v_branch is null then
    raise exception 'STOREFRONT: no active branch';
  end if;

  -- Rebuild the lines from scratch: only id and quantity survive, and every
  -- product must be one this storefront actually publishes.
  v_lines := '[]'::jsonb;
  for v_line in select * from jsonb_array_elements(p_payload->'lines') loop
    select * into v_prod
      from products
     where id = (v_line->>'productId')::uuid
       and org_id = v_sf.org_id
       and is_active and online_visible;
    if not found then
      raise exception 'PRODUCT: % is not available online', v_line->>'productId';
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'quantity',   greatest((v_line->>'quantity')::numeric, 1),
      'discount',   0
    );
    v_total := v_total + coalesce(v_prod.online_price, v_prod.sale_price)
               * greatest((v_line->>'quantity')::numeric, 1);
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'ORDER: empty order';
  end if;

  -- Cash on delivery: settled in full at handover, so tender equals the total.
  return create_sale_internal(v_sf.org_id, null, jsonb_build_object(
    'branch_id',       v_branch,
    'client_uuid',     nullif(p_payload->>'clientUuid', ''),
    'payment_method',  'cash',
    'cash_received',   v_total,
    'customer_name',   left(coalesce(p_payload->>'customerName', ''), 120),
    'customer_mobile', left(coalesce(p_payload->>'customerMobile', ''), 40),
    'lines',           v_lines
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants — anonymous shoppers may read the shop and place an order.
-- ---------------------------------------------------------------------------
grant execute on function storefront_info(text, text)                    to anon, authenticated;
grant execute on function storefront_catalog(text, text, text, text, int, int) to anon, authenticated;
grant execute on function storefront_product(text, text, text)           to anon, authenticated;
grant execute on function storefront_product_slugs(text, text)           to anon, authenticated;
grant execute on function storefront_create_order(text, text, jsonb)     to anon, authenticated;

-- storefront_by_host is an internal helper; it leaks nothing sensitive but is
-- not part of the public surface.
revoke all on function storefront_by_host(text, text) from public, anon, authenticated;
