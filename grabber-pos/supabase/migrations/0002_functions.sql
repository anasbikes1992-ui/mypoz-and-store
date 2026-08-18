-- GRABBER POS Studio — server-side business logic (atomic, fail-closed).

-- Resolve the calling user's organization from their profile.
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- Per-branch daily receipt number: GPS-<branchcode>-<yyyymmdd>-<seq>
create or replace function next_receipt_no(p_branch uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_seq  int;
begin
  select code into v_code from branches where id = p_branch;
  select count(*) + 1 into v_seq
    from sales
   where branch_id = p_branch
     and created_at::date = now()::date;
  return format('GPS-%s-%s-%s', v_code, to_char(now(), 'YYYYMMDD'), lpad(v_seq::text, 4, '0'));
end;
$$;

-- ---------------------------------------------------------------------------
-- create_sale: the single entry point for posting a sale.
-- Validates prices/discounts server-side, checks stock, writes sale + lines
-- + payments + stock movements atomically. Idempotent on client_uuid so an
-- offline terminal can safely retry without double-posting.
--
-- payload shape:
-- {
--   "branch_id": uuid,
--   "register_id": uuid | null,
--   "shift_id": uuid | null,
--   "client_uuid": uuid,          -- generated on the device
--   "payment_method": "cash"|"card"|"wholesale"|"mixed",
--   "cash_received": number | null,
--   "lines": [{ "product_id": uuid, "quantity": number, "discount": number }],
--   "payments": [{ "method": text, "amount": number, "reference": text }]  -- optional
-- }
-- ---------------------------------------------------------------------------
create or replace function create_sale(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org          uuid := current_org_id();
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

  -- Branch must belong to caller's org.
  if not exists (select 1 from branches where id = v_branch and org_id = v_org) then
    raise exception 'BRANCH: % not in caller org', v_branch;
  end if;

  -- Idempotency: return the prior sale if this client_uuid already posted.
  if v_client_uuid is not null then
    select id into v_existing
      from sales where org_id = v_org and client_uuid = v_client_uuid;
    if v_existing is not null then
      return get_sale(v_existing);
    end if;
  end if;

  -- Validate every line against the catalog (never trust client prices).
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

    -- Fail closed on insufficient stock.
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

  -- Apply whole-bill final discount (capped) then service charge.
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
    v_client_uuid, auth.uid()
  ) returning id into v_sale_id;

  -- Post lines + decrement stock + movement rows.
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
    values (v_org, v_branch, v_product.id, -v_qty, v_stock, 'sale', v_sale_id, auth.uid());
  end loop;

  -- Payments (split payments supported; default to the single method).
  if payload ? 'payments' and jsonb_array_length(payload->'payments') > 0 then
    insert into payments (sale_id, method, amount, reference)
    select v_sale_id, (p->>'method')::payment_method, (p->>'amount')::numeric, p->>'reference'
      from jsonb_array_elements(payload->'payments') p;
  else
    insert into payments (sale_id, method, amount)
    values (v_sale_id, v_method, v_total);
  end if;

  insert into audit_events (org_id, actor_id, action, entity, entity_id, metadata)
  values (v_org, auth.uid(), 'sale.created', 'sale', v_sale_id::text,
          jsonb_build_object('total', v_total, 'receipt_no', v_receipt));

  return get_sale(v_sale_id);
end;
$$;

-- Return a sale as a nested jsonb document (sale + lines + payments).
create or replace function get_sale(p_sale uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(s)
         || jsonb_build_object(
              'lines', coalesce((select jsonb_agg(to_jsonb(l)) from sale_lines l where l.sale_id = s.id), '[]'::jsonb),
              'payments', coalesce((select jsonb_agg(to_jsonb(p)) from payments p where p.sale_id = s.id), '[]'::jsonb)
            )
    from sales s where s.id = p_sale;
$$;

-- Receive a purchase: add stock, write movements, mark received.
create or replace function receive_purchase(p_purchase uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_branch uuid;
  v_line purchase_lines%rowtype;
  v_bal numeric;
begin
  select branch_id into v_branch from purchases
   where id = p_purchase and org_id = v_org and status = 'draft';
  if v_branch is null then
    raise exception 'PURCHASE: % not a draft in caller org', p_purchase;
  end if;

  for v_line in select * from purchase_lines where purchase_id = p_purchase loop
    insert into branch_stock (branch_id, product_id, quantity, expire_date)
    values (v_branch, v_line.product_id, v_line.quantity, v_line.expire_date)
    on conflict (branch_id, product_id)
      do update set quantity = branch_stock.quantity + excluded.quantity,
                    expire_date = coalesce(excluded.expire_date, branch_stock.expire_date),
                    updated_at = now()
    returning quantity into v_bal;

    insert into stock_movements
      (org_id, branch_id, product_id, delta, balance_after, reason, reference_id, created_by)
    values (v_org, v_branch, v_line.product_id, v_line.quantity, v_bal, 'purchase', p_purchase, auth.uid());
  end loop;

  update purchases set status = 'received' where id = p_purchase;
end;
$$;

-- Manual stock adjustment (manager+).
create or replace function adjust_stock(p_branch uuid, p_product uuid, p_delta numeric, p_note text)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_bal numeric;
begin
  if current_user_role() = 'cashier' then
    raise exception 'ROLE: cashiers cannot adjust stock';
  end if;
  insert into branch_stock (branch_id, product_id, quantity)
  values (p_branch, p_product, p_delta)
  on conflict (branch_id, product_id)
    do update set quantity = branch_stock.quantity + p_delta, updated_at = now()
  returning quantity into v_bal;

  insert into stock_movements
    (org_id, branch_id, product_id, delta, balance_after, reason, note, created_by)
  values (v_org, p_branch, p_product, p_delta, v_bal, 'adjustment', p_note, auth.uid());
  return v_bal;
end;
$$;
