-- WhatsApp Cloud API webhook has no user session.
-- Resolve tenant by saved phone_number_id, else the sole organization.
-- Post through create_sale_internal so stock and sales.source = WHATSAPP stay
-- on the same ledger as POS / storefront.

grant execute on function create_sale_internal(uuid, uuid, jsonb) to service_role;

create or replace function whatsapp_resolve_org(p_phone_number_id text)
returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
  v_count int;
begin
  if nullif(btrim(coalesce(p_phone_number_id, '')), '') is not null then
    select d.org_id into v_org
      from app_documents d
     where d.key = 'whatsapp'
       and d.data->>'phoneNumberId' = btrim(p_phone_number_id)
     limit 1;
    if v_org is not null then
      return v_org;
    end if;
  end if;

  select count(*) into v_count from organizations;
  if v_count = 1 then
    select id into v_org from organizations limit 1;
    return v_org;
  end if;

  raise exception 'WHATSAPP: organization not resolved for phone number id';
end;
$$;

revoke all on function whatsapp_resolve_org(text) from public, anon, authenticated;
grant execute on function whatsapp_resolve_org(text) to service_role;

create or replace function whatsapp_create_order(p_phone_number_id text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_branch uuid;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_prod products%rowtype;
  v_qty numeric;
  v_total numeric := 0;
begin
  v_org := whatsapp_resolve_org(p_phone_number_id);

  v_branch := (
    select b.id from branches b
     where b.org_id = v_org and b.is_active
     order by b.created_at
     limit 1
  );
  if v_branch is null then
    raise exception 'WHATSAPP: no active branch';
  end if;

  for v_line in select * from jsonb_array_elements(p_payload->'lines') loop
    select * into v_prod
      from products
     where id = coalesce(
            nullif(v_line->>'product_id', '')::uuid,
            nullif(v_line->>'productId', '')::uuid
          )
       and org_id = v_org
       and is_active;
    if not found then
      raise exception 'PRODUCT: % not found', coalesce(v_line->>'product_id', v_line->>'productId');
    end if;

    v_qty := greatest(coalesce((v_line->>'quantity')::numeric, 1), 1);
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'quantity',   v_qty,
      'discount',   0
    );
    v_total := v_total + v_prod.sale_price * v_qty;
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'WHATSAPP: empty order';
  end if;

  return create_sale_internal(v_org, null, jsonb_build_object(
    'branch_id',          v_branch,
    'payment_method',     'cash',
    'cash_received',      v_total,
    'customer_name',      left(coalesce(p_payload->>'customerName', p_payload->>'customer_name', ''), 120),
    'customer_mobile',    left(coalesce(p_payload->>'customerMobile', p_payload->>'customer_mobile', ''), 40),
    'employee',           'whatsapp-bot',
    'source',             'WHATSAPP',
    'channel',            'whatsapp',
    'fulfillment_status', 'pending',
    'payment_status',     'pending',
    'lines',              v_lines
  ));
end;
$$;

revoke all on function whatsapp_create_order(text, jsonb) from public, anon, authenticated;
grant execute on function whatsapp_create_order(text, jsonb) to service_role;
