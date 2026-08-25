-- P0 hardening: transactional void support plus durable stocktake/transfer tables.

alter table if exists sales
  add column if not exists void_reason text,
  add column if not exists voided_at timestamptz;

create or replace function void_sale(p_sale uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_role user_role := current_user_role();
  v_sale sales%rowtype;
  v_line record;
  v_balance numeric;
begin
  if v_org is null then
    raise exception 'AUTH: no organization for caller';
  end if;
  if v_role not in ('owner', 'manager') then
    raise exception 'ROLE: only owner or manager may void a sale';
  end if;

  select * into v_sale
    from sales
   where id = p_sale and org_id = v_org
   for update;
  if not found then
    raise exception 'SALE: not found';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'SALE_ALREADY_VOID:%', p_sale;
  end if;

  for v_line in
    select product_id, variant_id, quantity
      from sale_lines
     where sale_id = p_sale
  loop
    if v_line.product_id is not null then
      insert into branch_stock (branch_id, product_id, quantity)
      values (v_sale.branch_id, v_line.product_id, v_line.quantity)
      on conflict (branch_id, product_id)
        do update set quantity = branch_stock.quantity + excluded.quantity,
                      updated_at = now()
      returning quantity into v_balance;

      insert into stock_movements
        (org_id, branch_id, product_id, delta, balance_after, reason, reference_id, note, created_by)
      values
        (v_org, v_sale.branch_id, v_line.product_id, v_line.quantity, v_balance, 'return', p_sale, left(coalesce(p_reason, ''), 500), auth.uid());
    end if;

    if v_line.variant_id is not null then
      insert into variant_branch_stock (branch_id, variant_id, quantity, updated_at)
      values (v_sale.branch_id, v_line.variant_id, v_line.quantity, now())
      on conflict (branch_id, variant_id)
        do update set quantity = variant_branch_stock.quantity + excluded.quantity,
                      updated_at = now();
    end if;
  end loop;

  update sales
     set status = 'voided',
         void_reason = left(coalesce(nullif(trim(p_reason), ''), 'No reason given'), 500),
         voided_at = now()
   where id = p_sale;

  insert into audit_events (org_id, actor_id, action, entity, entity_id, metadata)
  values (
    v_org,
    auth.uid(),
    'sale.voided',
    'sale',
    p_sale::text,
    jsonb_build_object('reason', left(coalesce(nullif(trim(p_reason), ''), 'No reason given'), 500))
  );

  return get_sale(p_sale);
end;
$$;

revoke all on function public.void_sale(uuid, text) from public, anon;
grant execute on function public.void_sale(uuid, text) to authenticated;

create table if not exists stocktakes (
  id         text primary key,
  org_id     uuid not null default current_org_id() references organizations(id) on delete cascade,
  branch_id  uuid references branches(id) on delete set null,
  status     text not null check (status in ('draft', 'posted')),
  note       text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  posted_at  timestamptz
);

create table if not exists stocktake_lines (
  id          uuid primary key default gen_random_uuid(),
  stocktake_id text not null references stocktakes(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  system_qty  numeric(12,3) not null,
  counted_qty numeric(12,3) not null,
  variance    numeric(12,3) not null
);

create index if not exists stocktakes_org_created_idx on stocktakes (org_id, created_at desc);
create index if not exists stocktake_lines_stocktake_idx on stocktake_lines (stocktake_id);

alter table stocktakes enable row level security;
alter table stocktake_lines enable row level security;

create policy stocktakes_rw on stocktakes
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy stocktake_lines_rw on stocktake_lines
  for all using (exists (
    select 1 from stocktakes s where s.id = stocktake_id and s.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from stocktakes s where s.id = stocktake_id and s.org_id = current_org_id()
  ));

create table if not exists stock_transfers (
  id               text primary key,
  org_id           uuid not null default current_org_id() references organizations(id) on delete cascade,
  source_branch_id uuid not null references branches(id) on delete cascade,
  target_branch_id uuid not null references branches(id) on delete cascade,
  status           text not null check (status in ('pending_dispatch', 'received_approved', 'rejected')),
  dispatched_by    text not null,
  dispatched_at    timestamptz not null default now(),
  received_by      text,
  received_at      timestamptz,
  notes            text
);

create table if not exists stock_transfer_lines (
  id          uuid primary key default gen_random_uuid(),
  transfer_id text not null references stock_transfers(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  product_name text not null,
  quantity    numeric(12,3) not null check (quantity > 0)
);

create index if not exists stock_transfers_org_created_idx on stock_transfers (org_id, dispatched_at desc);
create index if not exists stock_transfer_lines_transfer_idx on stock_transfer_lines (transfer_id);

alter table stock_transfers enable row level security;
alter table stock_transfer_lines enable row level security;

create policy stock_transfers_rw on stock_transfers
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy stock_transfer_lines_rw on stock_transfer_lines
  for all using (exists (
    select 1 from stock_transfers t where t.id = transfer_id and t.org_id = current_org_id()
  ))
  with check (exists (
    select 1 from stock_transfers t where t.id = transfer_id and t.org_id = current_org_id()
  ));
