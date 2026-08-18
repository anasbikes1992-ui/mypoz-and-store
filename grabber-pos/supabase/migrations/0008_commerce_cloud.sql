-- MyPoz Commerce Cloud — store presentation on top of existing POS data.
-- Products, stock, orders remain in the canonical tables from 0001–0007.
-- This migration only adds storefront presentation fields. Do not duplicate catalog.

alter table storefronts add column if not exists status text not null default 'draft'
  check (status in ('draft', 'published', 'suspended', 'archived'));
alter table storefronts add column if not exists theme_id text not null default 'local';
alter table storefronts add column if not exists locale text not null default 'en';
alter table storefronts add column if not exists timezone text not null default 'Asia/Colombo';
alter table storefronts add column if not exists currency text not null default 'LKR';
alter table storefronts add column if not exists published_at timestamptz;
alter table storefronts add column if not exists logo_url text;
alter table storefronts add column if not exists favicon_url text;
alter table storefronts add column if not exists contact_email text;
alter table storefronts add column if not exists contact_phone text;
alter table storefronts add column if not exists custom_domain text unique;

create table if not exists store_collections (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default current_org_id() references organizations(id) on delete cascade,
  title       text not null,
  slug        text not null,
  description text,
  source_category text,
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, slug)
);

alter table store_collections enable row level security;

drop policy if exists store_collections_rw on store_collections;
create policy store_collections_rw on store_collections
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create trigger store_collections_touch
  before update on store_collections
  for each row execute function set_updated_at();
