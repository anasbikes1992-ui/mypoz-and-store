-- MyPoz Commerce Cloud — Phase 1: first-class order source on canonical sales table.
-- Do NOT create a separate orders table.

create type sale_source as enum (
  'POS',
  'ONLINE_STORE',
  'WHATSAPP',
  'PHONE',
  'OTHER'
);

create type fulfillment_status as enum (
  'pending',
  'processing',
  'ready',
  'shipped',
  'delivered',
  'collected',
  'cancelled'
);

create type commerce_payment_status as enum (
  'pending',
  'paid',
  'refunded',
  'failed'
);

alter table sales add column if not exists source sale_source not null default 'POS';
alter table sales add column if not exists fulfillment_status fulfillment_status not null default 'pending';
alter table sales add column if not exists payment_status commerce_payment_status not null default 'paid';
alter table sales add column if not exists channel text;
alter table sales add column if not exists delivery_address text;
alter table sales add column if not exists delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0);
alter table sales add column if not exists cod_fee numeric(12,2) not null default 0 check (cod_fee >= 0);

create index if not exists sales_source_idx on sales (org_id, source, created_at desc);
create index if not exists sales_fulfillment_idx on sales (org_id, fulfillment_status);

-- Recreate create_sale_internal to accept commerce channel fields.
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
  v_delivery     numeric := greatest(coalesce((payload->>'delivery_fee')::numeric, 0), 0);
  v_cod          numeric := greatest(coalesce((payload->>'cod_fee')::numeric, 0), 0);
  v_source       sale_source := coalesce((payload->>'source')::sale_source, 'POS');
  v_fulfill      fulfillment_status := coalesce((payload->>'fulfillment_status')::fulfillment_status, 'pending');
  v_pay_status   commerce_payment_status := coalesce((payload->>'payment_status')::commerce_payment_status, 'paid');
  v_channel      text := nullif(payload->>'channel', '');
  v_delivery_addr text := nullif(payload->>'delivery_address', '');
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
      else coalesce(v_product.online_price, v_product.sale_price)
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
  v_total := v_total - v_final_disc + v_service + v_delivery + v_cod;

  if v_method = 'cash' and coalesce(v_cash, 0) < v_total then
    raise exception 'CASH: received % less than total %', v_cash, v_total;
  end if;

  v_receipt := next_receipt_no(v_branch);

  insert into sales (
    org_id, branch_id, register_id, shift_id, receipt_no,
    subtotal, discount_total, final_discount, service_charge, total,
    payment_method, is_wholesale, customer_name, customer_mobile, employee,
    cash_received, change_due, client_uuid, created_by,
    source, fulfillment_status, payment_status, channel,
    delivery_address, delivery_fee, cod_fee
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
    v_client_uuid, p_actor,
    v_source, v_fulfill, v_pay_status, v_channel,
    v_delivery_addr, v_delivery, v_cod
  ) returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(payload->'lines') loop
    select * into v_product from products where id = (v_line->>'product_id')::uuid;
    v_qty := (v_line->>'quantity')::numeric;
    v_discount := coalesce((v_line->>'discount')::numeric, 0);
    v_unit := case
      when v_wholesale and v_product.wholesale_price is not null
        then v_product.wholesale_price
      else coalesce(v_product.online_price, v_product.sale_price) end;

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
          jsonb_build_object('total', v_total, 'receipt_no', v_receipt, 'source', v_source));

  return get_sale(v_sale_id);
end;
$$;

-- Online orders stamp source=ONLINE_STORE and carry delivery metadata.
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
  v_subtotal numeric := 0;
  v_delivery numeric := 0;
  v_cod      numeric := 0;
  v_total    numeric := 0;
  v_line   jsonb;
  v_prod   products%rowtype;
  v_fulfill fulfillment_status := 'pending';
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
    v_subtotal := v_subtotal + coalesce(v_prod.online_price, v_prod.sale_price)
               * greatest((v_line->>'quantity')::numeric, 1);
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'ORDER: empty order';
  end if;

  v_delivery := greatest(coalesce((p_payload->>'deliveryFee')::numeric, 0), 0);
  v_cod      := greatest(coalesce((p_payload->>'codFee')::numeric, 0), 0);
  v_total    := v_subtotal + v_delivery + v_cod;

  if coalesce(p_payload->>'fulfilment', '') = 'pickup' then
    v_fulfill := 'ready';
  end if;

  return create_sale_internal(v_sf.org_id, null, jsonb_build_object(
    'branch_id',       v_branch,
    'client_uuid',     nullif(p_payload->>'clientUuid', ''),
    'payment_method',  'cash',
    'cash_received',   v_total,
    'customer_name',   left(coalesce(p_payload->>'customerName', ''), 120),
    'customer_mobile', left(coalesce(p_payload->>'customerMobile', ''), 40),
    'delivery_address', left(coalesce(p_payload->>'address', ''), 500),
    'delivery_fee',    v_delivery,
    'cod_fee',         v_cod,
    'source',          'ONLINE_STORE',
    'channel',         'storefront',
    'fulfillment_status', v_fulfill,
    'payment_status',  case when coalesce(p_payload->>'paymentMethod', 'cash') = 'card'
                            then 'pending' else 'paid' end,
    'lines',           v_lines
  ));
end;
$$;
