create table if not exists sale_returns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default current_org_id() references organizations(id) on delete cascade,
  sale_id       uuid not null references sales(id) on delete cascade,
  branch_id     uuid not null references branches(id) on delete cascade,
  reason        text not null,
  note          text,
  status        text not null default 'approved' check (status in ('draft', 'approved', 'cancelled')),
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists sale_return_lines (
  id             uuid primary key default gen_random_uuid(),
  return_id      uuid not null references sale_returns(id) on delete cascade,
  sale_line_id   uuid not null references sale_lines(id) on delete cascade,
  product_id     uuid references products(id) on delete set null,
  quantity       numeric(12,3) not null check (quantity > 0),
  unit_price     numeric(12,2) not null default 0,
  refund_amount  numeric(12,2) not null default 0,
  disposition    text not null default 'restock' check (disposition in ('restock', 'damage', 'discard'))
);

create table if not exists refunds (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default current_org_id() references organizations(id) on delete cascade,
  return_id      uuid not null references sale_returns(id) on delete cascade,
  sale_id        uuid not null references sales(id) on delete cascade,
  method         text not null check (method in ('cash', 'original', 'store_credit')),
  amount         numeric(12,2) not null check (amount >= 0),
  note           text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists refund_lines (
  id              uuid primary key default gen_random_uuid(),
  refund_id       uuid not null references refunds(id) on delete cascade,
  return_line_id  uuid not null references sale_return_lines(id) on delete cascade,
  amount          numeric(12,2) not null check (amount >= 0)
);

create index if not exists sale_returns_org_created_idx on sale_returns (org_id, created_at desc);
create index if not exists sale_return_lines_return_idx on sale_return_lines (return_id);
create index if not exists refunds_org_created_idx on refunds (org_id, created_at desc);
create index if not exists refund_lines_refund_idx on refund_lines (refund_id);

alter table sale_returns enable row level security;
alter table sale_return_lines enable row level security;
alter table refunds enable row level security;
alter table refund_lines enable row level security;

create policy sale_returns_rw on sale_returns
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy sale_return_lines_rw on sale_return_lines
  for all using (exists (
    select 1 from sale_returns r where r.id = return_id and r.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from sale_returns r where r.id = return_id and r.org_id = current_org_id()
  ));

create policy refunds_rw on refunds
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy refund_lines_rw on refund_lines
  for all using (exists (
    select 1 from refunds r where r.id = refund_id and r.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from refunds r where r.id = refund_id and r.org_id = current_org_id()
  ));
