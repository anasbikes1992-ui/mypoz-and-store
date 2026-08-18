-- MyPoz Commerce Cloud — P0/P1: variant-aware sales + fulfillment transitions.
-- Canonical inventory remains branch_stock (product) + variant_branch_stock (SKU).
-- Do not create a second order or stock ledger.

-- Restore storefront_catalog named arg `p_size` (0007) while keeping commerce fields (0010).
drop function if exists storefront_catalog(text, text, text, text, int, int);

create or replace function storefront_catalog(
  p_host     text,
  p_slug     text,
  p_search   text default null,
  p_category text default null,
  p_page     int  default 1,
  p_size     int  default 24
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sf storefronts;
  v_org uuid;
  v_branch uuid;
  v_offset int;
  v_total bigint;
  v_items jsonb;
  v_cats jsonb;
begin
  select * into v_sf from storefront_by_host(p_host, p_slug);
  if v_sf.org_id is null then return null; end if;
  v_org := v_sf.org_id;
  v_branch := coalesce(v_sf.branch_id,
    (select b.id from branches b where b.org_id = v_org and b.is_active order by b.created_at limit 1));
  v_offset := greatest((coalesce(p_page, 1) - 1) * coalesce(p_size, 24), 0);

  select count(*) into v_total
    from products p
   where p.org_id = v_org and p.is_active and p.online_visible
     and coalesce(p.online_status, 'published') = 'published'
     and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%'
          or coalesce(p.description, '') ilike '%' || p_search || '%')
     and (p_category is null or p_category = '' or p_category = 'all'
          or exists (select 1 from categories c where c.id = p.category_id and c.name = p_category));

  select coalesce(jsonb_agg(row_to_json(f)::jsonb order by f.featured desc, f.name), '[]'::jsonb) into v_items
    from (
      select p.id, p.slug, p.name, p.name_local as "nameLocal",
             p.description, p.brand,
             coalesce(p.online_price, p.sale_price) as price,
             p.compare_at_price as "compareAtPrice",
             p.image_url as "imageUrl",
             coalesce(bs.quantity, 0) as stock,
             p.featured,
             p.tags,
             (select b.barcode from product_barcodes b where b.product_id = p.id limit 1) as barcode,
             (select c.name from categories c where c.id = p.category_id) as category
        from products p
        left join branch_stock bs on bs.product_id = p.id and bs.branch_id = v_branch
       where p.org_id = v_org and p.is_active and p.online_visible
         and coalesce(p.online_status, 'published') = 'published'
         and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%'
              or coalesce(p.description, '') ilike '%' || p_search || '%')
         and (p_category is null or p_category = '' or p_category = 'all'
              or exists (select 1 from categories c where c.id = p.category_id and c.name = p_category))
       order by p.featured desc, p.name
       limit coalesce(p_size, 24) offset v_offset
    ) f;

  select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'count', c.cnt)), '[]'::jsonb) into v_cats
    from (
      select cat.name, count(*) as cnt
        from products p
        join categories cat on cat.id = p.category_id
       where p.org_id = v_org and p.is_active and p.online_visible
         and coalesce(p.online_status, 'published') = 'published'
       group by cat.name order by cat.name
    ) c;

  return jsonb_build_object('items', v_items, 'total', v_total, 'categories', v_cats);
end;
$$;

grant execute on function storefront_catalog(text, text, text, text, int, int) to anon, authenticated;

-- Variant-aware create_sale_internal. POS uses sale_price; online uses online_price.
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
  v_variant      product_variants%rowtype;
  v_variant_id   uuid;
  v_has_variants boolean;
  v_qty          numeric;
  v_discount     numeric;
  v_unit         numeric;
  v_line_total   numeric;
  v_subtotal     numeric := 0;
  v_discount_tot numeric := 0;
  v_total        numeric := 0;
  v_stock        numeric;
  v_vstock       numeric;
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
  v_line_name    text;
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

    v_variant_id := nullif(v_line->>'variant_id', '')::uuid;
    if v_variant_id is null and nullif(v_line->>'variant_sku', '') is not null then
      select id into v_variant_id
        from product_variants
       where product_id = v_product.id and org_id = v_org and is_active
         and sku = v_line->>'variant_sku';
    end if;

    select exists(
      select 1 from product_variants
       where product_id = v_product.id and is_active
    ) into v_has_variants;

    if v_has_variants and v_variant_id is null then
      raise exception 'VARIANT: % requires a variant', v_product.name;
    end if;

    if v_variant_id is not null then
      select * into v_variant
        from product_variants
       where id = v_variant_id and product_id = v_product.id and org_id = v_org and is_active;
      if not found then
        raise exception 'VARIANT: % not found for %', v_variant_id, v_product.name;
      end if;
    end if;

    v_unit := case
      when v_wholesale and v_product.wholesale_price is not null
        then v_product.wholesale_price
      when v_variant_id is not null and v_variant.sale_price is not null
        then v_variant.sale_price
      when v_source = 'ONLINE_STORE'
        then coalesce(v_product.online_price, v_product.sale_price)
      else v_product.sale_price
    end;

    if v_variant_id is not null then
      select quantity into v_vstock
        from variant_branch_stock
       where branch_id = v_branch and variant_id = v_variant_id;
      if v_vstock is null then
        select quantity into v_vstock
          from branch_stock where branch_id = v_branch and product_id = v_product.id;
      end if;
      v_vstock := coalesce(v_vstock, 0);
      if v_vstock < v_qty then
        raise exception 'STOCK: only % of % available', v_vstock, coalesce(v_variant.title, v_product.name);
      end if;
    else
      select quantity into v_stock
        from branch_stock where branch_id = v_branch and product_id = v_product.id;
      v_stock := coalesce(v_stock, 0);
      if v_stock < v_qty then
        raise exception 'STOCK: only % of % available', v_stock, v_product.name;
      end if;
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
    v_variant_id := nullif(v_line->>'variant_id', '')::uuid;
    if v_variant_id is null and nullif(v_line->>'variant_sku', '') is not null then
      select id into v_variant_id
        from product_variants
       where product_id = v_product.id and org_id = v_org and sku = v_line->>'variant_sku';
    end if;
    if v_variant_id is not null then
      select * into v_variant from product_variants where id = v_variant_id;
    end if;

    v_unit := case
      when v_wholesale and v_product.wholesale_price is not null
        then v_product.wholesale_price
      when v_variant_id is not null and v_variant.sale_price is not null
        then v_variant.sale_price
      when v_source = 'ONLINE_STORE'
        then coalesce(v_product.online_price, v_product.sale_price)
      else v_product.sale_price end;

    v_line_name := case
      when v_variant_id is not null then v_product.name || ' — ' || v_variant.title
      else v_product.name end;

    insert into sale_lines (sale_id, product_id, variant_id, name, unit_price, quantity, discount, line_total)
    values (v_sale_id, v_product.id, v_variant_id, v_line_name, v_unit, v_qty, v_discount,
            (v_unit - v_discount) * v_qty);

    update branch_stock
       set quantity = quantity - v_qty, updated_at = now()
     where branch_id = v_branch and product_id = v_product.id
     returning quantity into v_stock;

    if not found then
      insert into branch_stock (branch_id, product_id, quantity)
      values (v_branch, v_product.id, -v_qty)
      returning quantity into v_stock;
    end if;

    if v_variant_id is not null then
      insert into variant_branch_stock (branch_id, variant_id, quantity, updated_at)
      values (v_branch, v_variant_id, v_stock, now())
      on conflict (branch_id, variant_id)
        do update set quantity = variant_branch_stock.quantity - v_qty, updated_at = now();
    end if;

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
  v_variant product_variants%rowtype;
  v_variant_id uuid;
  v_unit numeric;
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

    v_variant_id := nullif(v_line->>'variantId', '')::uuid;
    v_unit := coalesce(v_prod.online_price, v_prod.sale_price);
    if v_variant_id is not null then
      select * into v_variant
        from product_variants
       where id = v_variant_id and product_id = v_prod.id and is_active;
      if not found then
        raise exception 'VARIANT: % is not available online', v_variant_id;
      end if;
      v_unit := coalesce(v_variant.sale_price, v_unit);
    elsif exists (select 1 from product_variants pv where pv.product_id = v_prod.id and pv.is_active) then
      raise exception 'VARIANT: % requires a variant', v_prod.name;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'variant_id', v_variant_id,
      'quantity',   greatest((v_line->>'quantity')::numeric, 1),
      'discount',   0
    );
    v_subtotal := v_subtotal + v_unit * greatest((v_line->>'quantity')::numeric, 1);
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

-- Merchant fulfillment transitions on the canonical sales row.
create or replace function update_sale_fulfillment(p_sale uuid, p_status fulfillment_status)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
begin
  if v_org is null then
    raise exception 'AUTH: no organization for caller';
  end if;
  update sales
     set fulfillment_status = p_status
   where id = p_sale and org_id = v_org
     and status <> 'voided';
  if not found then
    raise exception 'SALE: not found';
  end if;
  insert into audit_events (org_id, actor_id, action, entity, entity_id, metadata)
  values (v_org, auth.uid(), 'sale.fulfillment', 'sale', p_sale::text,
          jsonb_build_object('status', p_status));
  return get_sale(p_sale);
end;
$$;

grant execute on function update_sale_fulfillment(uuid, fulfillment_status) to authenticated;

-- Realtime: POS hears online orders as they land.
alter table sales replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table sales;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
