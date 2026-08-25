-- 0030: fix adjust_stock reason typing against movement_reason enum.
-- Live enum labels: sale, purchase, adjustment, return, transfer_in, transfer_out, opening.
-- Map extended reason strings onto those labels; cast explicitly; reject negative balances.

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
  v_enum public.movement_reason;
begin
  if current_user_role() = 'cashier' then
    raise exception 'ROLE: cashiers cannot adjust stock';
  end if;

  -- Map caller reasons onto existing enum values.
  v_reason := case v_reason
    when 'sale' then 'sale'
    when 'purchase' then 'purchase'
    when 'grn' then 'purchase'
    when 'return' then 'return'
    when 'transfer_in' then 'transfer_in'
    when 'transfer_out' then 'transfer_out'
    when 'opening' then 'opening'
    when 'void' then 'adjustment'
    when 'damage' then 'adjustment'
    when 'stocktake' then 'adjustment'
    when 'adjustment' then 'adjustment'
    else 'adjustment'
  end;

  v_enum := v_reason::public.movement_reason;

  insert into branch_stock (branch_id, product_id, quantity)
  values (p_branch, p_product, p_delta)
  on conflict (branch_id, product_id)
    do update set quantity = branch_stock.quantity + p_delta, updated_at = now()
  returning quantity into v_bal;

  if v_bal < 0 then
    raise exception 'STOCK: insufficient quantity (would be %)', v_bal;
  end if;

  insert into stock_movements
    (org_id, branch_id, product_id, delta, balance_after, reason, reference_id, note, created_by)
  values (
    v_org, p_branch, p_product, p_delta, v_bal,
    v_enum, p_reference_id, p_note, auth.uid()
  );
  return v_bal;
end;
$$;

revoke all on function public.adjust_stock(uuid, uuid, numeric, text, text, uuid) from public;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text, text, uuid) to authenticated, service_role;
