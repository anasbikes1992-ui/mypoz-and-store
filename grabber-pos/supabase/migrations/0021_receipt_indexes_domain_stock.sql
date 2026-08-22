create table if not exists receipt_counters (
  branch_id uuid not null references branches(id) on delete cascade,
  day       date not null,
  seq       int not null default 0,
  primary key (branch_id, day)
);

create or replace function next_receipt_no(p_branch uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_seq  int;
begin
  select code into v_code from branches where id = p_branch;
  insert into receipt_counters(branch_id, day, seq) values (p_branch, now()::date, 1)
  on conflict (branch_id, day) do update set seq = receipt_counters.seq + 1
  returning seq into v_seq;
  return format('GPS-%s-%s-%s', v_code, to_char(now(), 'YYYYMMDD'), lpad(v_seq::text, 4, '0'));
end;
$$;

create index if not exists purchase_lines_purchase_id_idx on purchase_lines (purchase_id);
create index if not exists payments_sale_id_idx on payments (sale_id);
create index if not exists profiles_org_id_idx on profiles (org_id);
create index if not exists shifts_register_id_idx on shifts (register_id);
create index if not exists stock_movements_org_id_idx on stock_movements (org_id);
create index if not exists sale_lines_sale_id_idx on sale_lines (sale_id);

do $idx$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'app_collections'
       and column_name = 'collection'
  ) then
    execute 'create index if not exists app_collections_collection_idx on app_collections (collection)';
  end if;
end;
$idx$;

create or replace function storefront_by_host(p_host text, p_slug text)
returns storefronts
language sql stable security definer set search_path = public as $$
  select * from storefronts
   where enabled
     and (
       custom_domain = lower(nullif(p_host, ''))
       or domain = lower(nullif(p_host, ''))
       or slug = nullif(p_slug, '')
     )
   order by
     (custom_domain = lower(nullif(p_host, ''))) desc,
     (domain = lower(nullif(p_host, ''))) desc
   limit 1;
$$;

revoke all on function storefront_by_host(text, text) from public, anon, authenticated;

create or replace function set_branch_stock(
  p_branch uuid, p_product uuid, p_quantity numeric, p_note text
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid := current_org_id();
  v_old   numeric := 0;
  v_delta numeric;
  v_bal   numeric;
begin
  if current_user_role() = 'cashier' then
    raise exception 'ROLE: cashiers cannot adjust stock';
  end if;

  select quantity into v_old
    from branch_stock
   where branch_id = p_branch and product_id = p_product
   for update;
  v_old := coalesce(v_old, 0);
  v_delta := p_quantity - v_old;
  if v_delta = 0 then
    return v_old;
  end if;

  insert into branch_stock (branch_id, product_id, quantity)
  values (p_branch, p_product, p_quantity)
  on conflict (branch_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now()
  returning quantity into v_bal;

  insert into stock_movements
    (org_id, branch_id, product_id, delta, balance_after, reason, note, created_by)
  values (v_org, p_branch, p_product, v_delta, v_bal, 'adjustment', p_note, auth.uid());

  return v_bal;
end;
$$;

grant execute on function set_branch_stock(uuid, uuid, numeric, text) to authenticated;

create or replace function hq_provision_tenant(
  p_name text,
  p_slug text,
  p_plan text,
  p_expiry text,
  p_logo text,
  p_accent text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org    uuid;
  v_branch uuid;
  v_slug   text := nullif(trim(p_slug), '');
begin
  if v_slug is null or v_slug = '' then
    v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  end if;
  if v_slug is null or v_slug = '' then
    raise exception 'SLUG: could not derive slug from name';
  end if;

  insert into organizations (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_org;

  insert into branches (org_id, name, code)
  values (v_org, 'Main Branch', 'MAIN')
  returning id into v_branch;

  insert into registers (branch_id, name)
  values (v_branch, 'Register 1');

  insert into app_documents (org_id, key, data)
  values (
    v_org,
    'tenant',
    jsonb_build_object(
      'brand', jsonb_build_object(
        'businessName', trim(p_name),
        'logoUrl', coalesce(p_logo, ''),
        'accentColor', coalesce(p_accent, '')
      ),
      'license', jsonb_build_object(
        'plan', coalesce(p_plan, 'starter'),
        'expiry', coalesce(p_expiry, ''),
        'extras', '[]'::jsonb,
        'suspended', false
      )
    )
  );

  insert into storefronts (org_id, branch_id, slug, enabled, status, published_at)
  values (v_org, v_branch, v_slug, true, 'published', now());

  return jsonb_build_object('orgId', v_org, 'slug', v_slug);
end;
$$;

revoke all on function hq_provision_tenant(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function hq_provision_tenant(text, text, text, text, text, text)
  to service_role;