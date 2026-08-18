-- Add 0010 product commerce columns without replacing storefront_catalog
-- (CREATE OR REPLACE cannot rename p_size → p_page_size).

alter table products add column if not exists compare_at_price numeric(12,2) check (compare_at_price >= 0);
alter table products add column if not exists tags text[] not null default '{}';
alter table products add column if not exists seo_title text;
alter table products add column if not exists seo_description text;
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists online_status text not null default 'published';
alter table products add column if not exists weight_grams integer check (weight_grams >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_online_status_check'
  ) then
    alter table products
      add constraint products_online_status_check
      check (online_status in ('draft', 'published', 'archived'));
  end if;
end $$;

create index if not exists products_featured_idx on products (org_id, featured) where featured;
create index if not exists products_tags_idx on products using gin (tags);
