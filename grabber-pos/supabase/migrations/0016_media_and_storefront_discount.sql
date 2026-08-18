-- Durable product/theme images (public bucket, org-prefixed paths).
-- Also stamps storefront card-order discounts onto create_sale_internal.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists media_insert_org on storage.objects;
create policy media_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists media_update_org on storage.objects;
create policy media_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = current_org_id()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists media_delete_org on storage.objects;
create policy media_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

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
  v_discount numeric := 0;
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
  v_discount := least(v_subtotal, greatest(coalesce((p_payload->>'final_discount')::numeric, 0), 0));
  v_total    := v_subtotal - v_discount + v_delivery + v_cod;

  if coalesce(p_payload->>'fulfilment', '') = 'pickup' then
    v_fulfill := 'ready';
  end if;

  return create_sale_internal(v_sf.org_id, null, jsonb_build_object(
    'branch_id',       v_branch,
    'client_uuid',     nullif(p_payload->>'clientUuid', ''),
    'payment_method',  'cash',
    'cash_received',   v_total,
    'final_discount',  v_discount,
    'customer_name',   left(coalesce(p_payload->>'customerName', ''), 120),
    'customer_mobile', left(coalesce(p_payload->>'customerMobile', ''), 40),
    'delivery_address', left(coalesce(p_payload->>'address', ''), 500),
    'delivery_fee',    v_delivery,
    'cod_fee',         v_cod,
    'source',          'ONLINE_STORE',
    'channel',         'storefront',
    'fulfillment_status', v_fulfill,
    'payment_status',  case when coalesce(p_payload->>'paymentMethod', 'cash') = 'card'
                            then 'paid' else 'paid' end,
    'lines',           v_lines
  ));
end;
$$;
