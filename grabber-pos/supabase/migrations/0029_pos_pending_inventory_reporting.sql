-- 0029_pos_pending_inventory_reporting.sql
-- POS pending payment intents (session DEFINER), stock movement reason params,
-- and server-side sales report aggregation.

-- ---------------------------------------------------------------------------
-- create_pos_payment_intent: pending card/online sale without stock movement
-- ---------------------------------------------------------------------------
create or replace function public.create_pos_payment_intent(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.current_org_id();
  v_branch uuid;
  v_ref text;
  v_client uuid;
  v_amount_minor integer;
  v_row public.payment_intents;
begin
  if auth.uid() is null then
    raise exception 'AUTH: session required';
  end if;
  if v_org is null then
    raise exception 'AUTH: no organization';
  end if;

  v_branch := nullif(payload->>'branch_id','')::uuid;
  if v_branch is null then
    select id into v_branch from public.branches
     where org_id = v_org and is_active
     order by created_at asc limit 1;
  end if;
  if v_branch is null then
    raise exception 'BRANCH: none active';
  end if;

  v_ref := coalesce(nullif(payload->>'reference',''), 'POS-' || substr(replace(gen_random_uuid()::text,'-',''),1,12));
  v_client := nullif(payload->>'client_uuid','')::uuid;
  v_amount_minor := coalesce((payload->>'amount_minor')::integer, 0);
  if v_amount_minor <= 0 then
    raise exception 'PAYMENT: amount_minor required';
  end if;

  insert into public.payment_intents (
    org_id, branch_id, reference, provider, currency, amount_minor, status,
    client_uuid, description, customer_name, customer_email, source, metadata
  ) values (
    v_org, v_branch, v_ref,
    coalesce(nullif(payload->>'provider',''), 'POS_GATEWAY'),
    coalesce(nullif(payload->>'currency',''), 'LKR'),
    v_amount_minor,
    'pending',
    v_client,
    nullif(payload->>'description',''),
    nullif(payload->>'customer_name',''),
    nullif(payload->>'customer_email',''),
    'pos',
    coalesce(payload->'metadata', '{}'::jsonb) || jsonb_build_object(
      'pendingSale', coalesce(payload->'pending_sale', '{}'::jsonb),
      'kind', 'pos_sale'
    )
  )
  on conflict (org_id, reference) do update set
    metadata = excluded.metadata,
    amount_minor = excluded.amount_minor,
    updated_at = now()
  returning * into v_row;

  perform public.write_audit_event(
    'payment.pending',
    'payment_intent',
    v_row.reference,
    jsonb_build_object('amount_minor', v_amount_minor, 'source', 'pos'),
    v_client::text,
    null, null, null, null
  );

  return jsonb_build_object(
    'id', v_row.id,
    'reference', v_row.reference,
    'status', 'pending',
    'amount_minor', v_row.amount_minor,
    'client_uuid', v_row.client_uuid,
    'created_at', v_row.created_at
  );
end;
$$;

revoke all on function public.create_pos_payment_intent(jsonb) from public;
grant execute on function public.create_pos_payment_intent(jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- adjust_stock: typed reason + optional reference (keep 4-arg callers working)
-- ---------------------------------------------------------------------------
-- Replace legacy 4-arg adjust_stock so all callers use typed reasons (defaults).
drop function if exists public.adjust_stock(uuid, uuid, numeric, text);

create or replace function public.adjust_stock(
  p_branch uuid,
  p_product uuid,
  p_delta numeric,
  p_note text,
  p_reason text default 'adjustment',
  p_reference_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := current_org_id();
  v_bal numeric;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'adjustment');
begin
  if current_user_role() = 'cashier' then
    raise exception 'ROLE: cashiers cannot adjust stock';
  end if;
  if v_reason not in (
    'sale','void','return','purchase','damage','adjustment',
    'transfer_out','transfer_in','stocktake','grn'
  ) then
    v_reason := 'adjustment';
  end if;

  insert into branch_stock (branch_id, product_id, quantity)
  values (p_branch, p_product, p_delta)
  on conflict (branch_id, product_id)
    do update set quantity = branch_stock.quantity + p_delta, updated_at = now()
  returning quantity into v_bal;

  insert into stock_movements
    (org_id, branch_id, product_id, delta, balance_after, reason, reference_id, note, created_by)
  values (v_org, p_branch, p_product, p_delta, v_bal, v_reason, p_reference_id, p_note, auth.uid());
  return v_bal;
end;
$$;

revoke all on function public.adjust_stock(uuid, uuid, numeric, text, text, uuid) from public;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- report_sales_summary: server-side aggregation (no browser math)
-- ---------------------------------------------------------------------------
create or replace function public.report_sales_summary(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_branch uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.current_org_id();
  v_from timestamptz := coalesce(p_from, date_trunc('day', now() - interval '30 days'));
  v_to timestamptz := coalesce(p_to, now());
  v_gross numeric := 0;
  v_discounts numeric := 0;
  v_refunds numeric := 0;
  v_net numeric := 0;
  v_cogs numeric := 0;
  v_tax numeric := 0;
  v_count integer := 0;
  v_items numeric := 0;
begin
  if auth.uid() is null or v_org is null then
    raise exception 'AUTH: session required';
  end if;
  if public.current_user_role() not in ('owner', 'manager', 'cashier') then
    raise exception 'ROLE: forbidden';
  end if;

  select
    coalesce(sum(s.total) filter (where s.status is distinct from 'voided'), 0),
    coalesce(sum(s.discount_total + s.final_discount) filter (where s.status is distinct from 'voided'), 0),
    coalesce(sum(s.tax_total) filter (where s.status is distinct from 'voided'), 0),
    count(*) filter (where s.status is distinct from 'voided'),
    coalesce(sum(s.total) filter (where s.status = 'voided'), 0)
  into v_gross, v_discounts, v_tax, v_count, v_refunds
  from public.sales s
  where s.org_id = v_org
    and s.created_at >= v_from
    and s.created_at <= v_to
    and (p_branch is null or s.branch_id = p_branch);

  -- Refunds table (explicit refunds)
  select v_refunds + coalesce(sum(r.amount), 0) into v_refunds
  from public.refunds r
  where r.org_id = v_org
    and r.created_at >= v_from
    and r.created_at <= v_to;

  select coalesce(sum(sl.quantity), 0),
         coalesce(sum(sl.quantity * coalesce(p.cost_price, 0)), 0)
    into v_items, v_cogs
  from public.sale_lines sl
  join public.sales s on s.id = sl.sale_id
  left join public.products p on p.id = sl.product_id
  where s.org_id = v_org
    and s.status is distinct from 'voided'
    and s.created_at >= v_from
    and s.created_at <= v_to
    and (p_branch is null or s.branch_id = p_branch);

  v_net := v_gross - v_refunds;

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'branch_id', p_branch,
    'gross_sales', v_gross,
    'discounts', v_discounts,
    'refunds', v_refunds,
    'net_sales', v_net,
    'tax', v_tax,
    'cogs', v_cogs,
    'gross_profit', v_net - v_cogs,
    'margin_pct', case when v_net > 0 then round(((v_net - v_cogs) / v_net) * 100, 2) else 0 end,
    'transaction_count', v_count,
    'items_sold', v_items,
    'avg_basket', case when v_count > 0 then round(v_net / v_count, 2) else 0 end,
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', payment_method, 'count', cnt, 'total', total) order by total desc)
      from (
        select payment_method, count(*)::int as cnt, coalesce(sum(total),0) as total
        from public.sales
        where org_id = v_org and status is distinct from 'voided'
          and created_at >= v_from and created_at <= v_to
          and (p_branch is null or branch_id = p_branch)
        group by payment_method
      ) m
    ), '[]'::jsonb),
    'by_cashier', coalesce((
      select jsonb_agg(jsonb_build_object('name', coalesce(nullif(employee,''),'Unassigned'), 'count', cnt, 'total', total) order by total desc)
      from (
        select employee, count(*)::int as cnt, coalesce(sum(total),0) as total
        from public.sales
        where org_id = v_org and status is distinct from 'voided'
          and created_at >= v_from and created_at <= v_to
          and (p_branch is null or branch_id = p_branch)
        group by employee
      ) c
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.report_sales_summary(timestamptz, timestamptz, uuid) from public;
grant execute on function public.report_sales_summary(timestamptz, timestamptz, uuid) to authenticated;
