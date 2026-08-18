-- GRABBER POS Studio — multi-tenant tables for the modules that use the local
-- file store in demo mode. In production these back the same features, RLS-scoped
-- per organization. org_id defaults to the caller's org so clients never set it.
--
-- Note: purchase orders already exist as `purchases` + `purchase_lines` +
-- receive_purchase() (0001/0002); the local po-store mirrors that flow.

-- Product images
alter table products add column if not exists image_url text;

-- ---------------------------------------------------------------------------
-- Generic collections (customers, employees, expenses, vouchers, tables, …)
-- One flexible table backs every simple CRUD module.
-- ---------------------------------------------------------------------------
create table app_collections (
  org_id     uuid not null default current_org_id() references organizations(id) on delete cascade,
  collection text not null,
  entity_id  text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, collection, entity_id)
);
create index app_collections_lookup_idx on app_collections (org_id, collection);

-- Business settings (one row per org)
create table app_settings (
  org_id     uuid primary key default current_org_id() references organizations(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Stock operation documents (GRN / return / damage headers). The stock change
-- itself flows through stock_movements + branch_stock via a definer RPC.
create table stock_documents (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default current_org_id() references organizations(id) on delete cascade,
  branch_id  uuid references branches(id) on delete set null,
  type       text not null check (type in ('grn', 'return', 'damage')),
  party      text,
  reference  text,
  note       text,
  total      numeric(12,2) not null default 0,
  lines      jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_documents_org_idx on stock_documents (org_id, type, created_at desc);

-- Live restaurant orders, one open order per table.
create table restaurant_orders (
  org_id     uuid not null default current_org_id() references organizations(id) on delete cascade,
  branch_id  uuid references branches(id) on delete set null,
  table_id   text not null,
  lines      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (org_id, table_id)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security — every table is scoped to the caller's organization.
-- ---------------------------------------------------------------------------
alter table app_collections    enable row level security;
alter table app_settings       enable row level security;
alter table stock_documents    enable row level security;
alter table restaurant_orders  enable row level security;

create policy app_collections_rw on app_collections
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy app_settings_rw on app_settings
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy stock_documents_rw on stock_documents
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy restaurant_orders_rw on restaurant_orders
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

-- updated_at maintenance
create trigger app_collections_touch
  before update on app_collections
  for each row execute function set_updated_at();
create trigger restaurant_orders_touch
  before update on restaurant_orders
  for each row execute function set_updated_at();
