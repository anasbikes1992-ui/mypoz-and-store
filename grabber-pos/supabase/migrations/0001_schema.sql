-- GRABBER POS Studio — core schema
-- Multi-tenant (organization -> branches), durable system-of-record.
-- All money is stored in minor units? No — LKR uses 2 decimals; we use numeric(12,2).

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table branches (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  code        text not null,
  address     text,
  currency    text not null default 'LKR',
  timezone    text not null default 'Asia/Colombo',
  is_active    boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (org_id, code)
);

-- Roles: owner (full), manager (branch admin), cashier (POS only)
create type user_role as enum ('owner', 'manager', 'cashier');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  full_name   text not null,
  role        user_role not null default 'cashier',
  is_active    boolean not null default true,
  created_at  timestamptz not null default now()
);

-- A user may operate several branches (e.g. a roaming manager).
create table branch_members (
  branch_id   uuid not null references branches(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  primary key (branch_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table suppliers (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz not null default now()
);

create table categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  parent_id   uuid references categories(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);

create table products (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  sku              text not null,
  name             text not null,
  name_local       text,
  brand            text,
  category_id      uuid references categories(id) on delete set null,
  supplier_id      uuid references suppliers(id) on delete set null,
  cost_price       numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price       numeric(12,2) not null default 0 check (sale_price >= 0),
  wholesale_price  numeric(12,2) check (wholesale_price >= 0),
  max_discount     numeric(12,2) not null default 0 check (max_discount >= 0),
  single_discount  numeric(12,2) not null default 0 check (single_discount >= 0),
  reorder_level    integer not null default 5 check (reorder_level >= 0),
  warranty_months  integer not null default 0 check (warranty_months >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, sku)
);

create table product_barcodes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  barcode     text not null,
  unique (org_id, barcode)
);

-- Stock is tracked per branch so each store has independent inventory.
create table branch_stock (
  branch_id   uuid not null references branches(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  quantity    numeric(12,3) not null default 0,
  expire_date date,
  updated_at  timestamptz not null default now(),
  primary key (branch_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Inventory movement (append-only audit of every quantity change)
-- ---------------------------------------------------------------------------
create type movement_reason as enum
  ('sale', 'purchase', 'adjustment', 'return', 'transfer_in', 'transfer_out', 'opening');

create table stock_movements (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  branch_id      uuid not null references branches(id) on delete cascade,
  product_id     uuid not null references products(id) on delete cascade,
  delta          numeric(12,3) not null,
  balance_after  numeric(12,3) not null,
  reason         movement_reason not null,
  reference_id   uuid,
  note           text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Purchasing (stock in)
-- ---------------------------------------------------------------------------
create type purchase_status as enum ('draft', 'received', 'cancelled');

create table purchases (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  branch_id   uuid not null references branches(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  reference   text,
  status      purchase_status not null default 'draft',
  total       numeric(12,2) not null default 0,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table purchase_lines (
  id           uuid primary key default gen_random_uuid(),
  purchase_id  uuid not null references purchases(id) on delete cascade,
  product_id   uuid not null references products(id) on delete cascade,
  quantity     numeric(12,3) not null check (quantity > 0),
  cost_price   numeric(12,2) not null check (cost_price >= 0),
  expire_date  date
);

-- ---------------------------------------------------------------------------
-- Registers & cash-drawer shifts
-- ---------------------------------------------------------------------------
create table registers (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create type shift_status as enum ('open', 'closed');

create table shifts (
  id             uuid primary key default gen_random_uuid(),
  register_id    uuid not null references registers(id) on delete cascade,
  opened_by      uuid references profiles(id) on delete set null,
  opening_float  numeric(12,2) not null default 0,
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  closing_amount numeric(12,2),
  status         shift_status not null default 'open'
);

-- ---------------------------------------------------------------------------
-- Sales (stock out) — the heart of the POS
-- ---------------------------------------------------------------------------
create type payment_method as enum ('cash', 'card', 'wholesale', 'mixed');
create type sale_status as enum ('completed', 'voided');

create table sales (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  branch_id      uuid not null references branches(id) on delete cascade,
  register_id    uuid references registers(id) on delete set null,
  shift_id       uuid references shifts(id) on delete set null,
  receipt_no     text not null,
  subtotal       numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  final_discount numeric(12,2) not null default 0,
  service_charge numeric(12,2) not null default 0,
  tax_total      numeric(12,2) not null default 0,
  total          numeric(12,2) not null,
  payment_method payment_method not null,
  is_wholesale   boolean not null default false,
  customer_name  text,
  customer_mobile text,
  employee       text,
  cash_received  numeric(12,2),
  change_due     numeric(12,2),
  status         sale_status not null default 'completed',
  -- Idempotency key from the client so offline retries never double-post.
  client_uuid    uuid,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (org_id, receipt_no),
  unique (org_id, client_uuid)
);

create table sale_lines (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  name         text not null,
  unit_price   numeric(12,2) not null,
  quantity     numeric(12,3) not null check (quantity > 0),
  discount     numeric(12,2) not null default 0,
  line_total   numeric(12,2) not null
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  method      payment_method not null,
  amount      numeric(12,2) not null check (amount >= 0),
  reference   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit trail (who did what)
-- ---------------------------------------------------------------------------
create table audit_events (
  id          bigint generated always as identity primary key,
  org_id      uuid references organizations(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index products_org_active_idx    on products (org_id, is_active);
create index products_category_idx      on products (category_id);
create index products_name_trgm_idx     on products using gin (name gin_trgm_ops);
create index barcodes_lookup_idx        on product_barcodes (org_id, barcode);
create index branch_stock_branch_idx    on branch_stock (branch_id);
create index stock_movements_prod_idx   on stock_movements (product_id, created_at desc);
create index sales_branch_time_idx      on sales (branch_id, created_at desc);
create index sale_lines_sale_idx        on sale_lines (sale_id);
create index audit_org_time_idx         on audit_events (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();
