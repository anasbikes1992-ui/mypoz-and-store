-- GRABBER POS Studio — Row-Level Security.
-- Every tenant table is readable/writable only within the caller's org.
-- Writes to sales/stock go exclusively through SECURITY DEFINER RPCs, so the
-- table policies below stay read-only for clients where that matters.

alter table organizations   enable row level security;
alter table branches        enable row level security;
alter table profiles        enable row level security;
alter table branch_members  enable row level security;
alter table suppliers       enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table product_barcodes enable row level security;
alter table branch_stock    enable row level security;
alter table stock_movements enable row level security;
alter table purchases       enable row level security;
alter table purchase_lines  enable row level security;
alter table registers       enable row level security;
alter table shifts          enable row level security;
alter table sales           enable row level security;
alter table sale_lines      enable row level security;
alter table payments        enable row level security;
alter table audit_events    enable row level security;

-- Helper: caller org.
-- (current_org_id() defined in 0002_functions.sql)

-- Organizations: a user sees only their own.
create policy org_self on organizations
  for select using (id = current_org_id());

-- Branches.
create policy branch_read on branches
  for select using (org_id = current_org_id());
create policy branch_write on branches
  for all using (org_id = current_org_id() and current_user_role() in ('owner','manager'))
  with check (org_id = current_org_id());

-- Profiles: read peers in org; only owners manage them.
create policy profile_read on profiles
  for select using (org_id = current_org_id());
create policy profile_write on profiles
  for all using (org_id = current_org_id() and current_user_role() = 'owner')
  with check (org_id = current_org_id());

create policy branch_members_read on branch_members
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = current_org_id()));

-- Generic org-scoped read for catalog/reference tables.
create policy suppliers_rw on suppliers
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy categories_rw on categories
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy products_read on products
  for select using (org_id = current_org_id());
create policy products_write on products
  for all using (org_id = current_org_id() and current_user_role() in ('owner','manager'))
  with check (org_id = current_org_id());
create policy barcodes_rw on product_barcodes
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

-- Stock: read within org; mutations happen via RPC (definer) only.
create policy branch_stock_read on branch_stock
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = current_org_id()));
create policy movements_read on stock_movements
  for select using (org_id = current_org_id());

-- Purchases.
create policy purchases_rw on purchases
  for all using (org_id = current_org_id() and current_user_role() in ('owner','manager'))
  with check (org_id = current_org_id());
create policy purchase_lines_rw on purchase_lines
  for all using (exists (
    select 1 from purchases p where p.id = purchase_id and p.org_id = current_org_id()))
  with check (exists (
    select 1 from purchases p where p.id = purchase_id and p.org_id = current_org_id()));

-- Registers & shifts.
create policy registers_read on registers
  for select using (exists (
    select 1 from branches b where b.id = branch_id and b.org_id = current_org_id()));
create policy shifts_rw on shifts
  for all using (exists (
    select 1 from registers r join branches b on b.id = r.branch_id
     where r.id = register_id and b.org_id = current_org_id()))
  with check (exists (
    select 1 from registers r join branches b on b.id = r.branch_id
     where r.id = register_id and b.org_id = current_org_id()));

-- Sales: read within org; inserts go through create_sale() only.
create policy sales_read on sales
  for select using (org_id = current_org_id());
create policy sale_lines_read on sale_lines
  for select using (exists (
    select 1 from sales s where s.id = sale_id and s.org_id = current_org_id()));
create policy payments_read on payments
  for select using (exists (
    select 1 from sales s where s.id = sale_id and s.org_id = current_org_id()));

-- Audit is read-only to clients.
create policy audit_read on audit_events
  for select using (org_id = current_org_id());
