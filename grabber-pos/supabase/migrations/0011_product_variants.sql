-- MyPoz Commerce Cloud — Phase 3: proper product variants (POS + web share inventory).

create table if not exists product_variants (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  sku             text not null,
  barcode         text,
  title           text not null,
  option1         text,
  option2         text,
  option3         text,
  sale_price      numeric(12,2) check (sale_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price >= 0),
  cost_price      numeric(12,2) check (cost_price >= 0),
  weight_grams    integer check (weight_grams >= 0),
  image_url       text,
  position        integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, sku)
);

create index if not exists product_variants_product_idx on product_variants (product_id, position);
create index if not exists product_variants_barcode_idx on product_variants (org_id, barcode) where barcode is not null;

alter table product_variants enable row level security;

drop policy if exists product_variants_rw on product_variants;
create policy product_variants_rw on product_variants
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create trigger product_variants_touch
  before update on product_variants
  for each row execute function set_updated_at();

-- Variant-level stock (optional; falls back to product-level branch_stock when no variant stock row).
create table if not exists variant_branch_stock (
  branch_id   uuid not null references branches(id) on delete cascade,
  variant_id  uuid not null references product_variants(id) on delete cascade,
  quantity    numeric(12,3) not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (branch_id, variant_id)
);

alter table variant_branch_stock enable row level security;

drop policy if exists variant_branch_stock_rw on variant_branch_stock;
create policy variant_branch_stock_rw on variant_branch_stock
  for all using (
    exists (select 1 from branches b where b.id = branch_id and b.org_id = current_org_id())
  ) with check (
    exists (select 1 from branches b where b.id = branch_id and b.org_id = current_org_id())
  );

-- Sale lines may reference a variant.
alter table sale_lines add column if not exists variant_id uuid references product_variants(id) on delete set null;

create index if not exists sale_lines_variant_idx on sale_lines (variant_id) where variant_id is not null;

-- Public read: variants for a product on the storefront.
create or replace function storefront_product_variants(p_host text, p_slug text, p_product text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'sku', v.sku,
    'title', v.title,
    'option1', v.option1,
    'option2', v.option2,
    'option3', v.option3,
    'price', coalesce(v.sale_price, p.online_price, p.sale_price),
    'compareAtPrice', v.compare_at_price,
    'imageUrl', coalesce(v.image_url, p.image_url),
    'stock', coalesce(vbs.quantity, bs.quantity, 0)
  ) order by v.position), '[]'::jsonb)
  from storefront_by_host(p_host, p_slug) s
  join products p on p.org_id = s.org_id and p.slug = p_product
                 and p.is_active and p.online_visible
  join product_variants v on v.product_id = p.id and v.is_active
  left join branch_stock bs on bs.product_id = p.id and bs.branch_id = s.branch_id
  left join variant_branch_stock vbs on vbs.variant_id = v.id and vbs.branch_id = s.branch_id;
$$;

grant execute on function storefront_product_variants(text, text, text) to anon, authenticated;
